import fetch from "node-fetch";

const apiToken = process.env.CALCOM_API_KEY;

interface Slot {
  date: string;
  time: string;
}

interface FormattedSlot {
  date: string;
  time: string;
  formattedTime: string;
}

interface CalComApiResponse {
  status: string;
  data: {
    slots: {
      [date: string]: { time: string }[];
    };
  };
}

function formatToConversationalDate(dateString: string): string {
  try {
    // Parse the Indian time string into a proper Date object
    // Example format: "4/21/2025, 3:30:00 PM"
    const date = new Date(dateString);
    
    if (isNaN(date.getTime())) {
      console.error(`Invalid date string format: ${dateString}`);
      return "Invalid Date";
    }
    
    const options: Intl.DateTimeFormatOptions = {
      weekday: "long",
      hour: "numeric",
      minute: "numeric",
      hour12: true,
      timeZone: "Asia/Kolkata",
    };
    return date.toLocaleString("en-IN", options);
  } catch (error) {
    console.error(`Error formatting date: ${dateString}`, error);
    return "Invalid Date";
  }
}

async function fetchAvailableSlots(): Promise<Slot[]> {
  const now = new Date();
  const startTime = now.toISOString();
  const end = new Date(now);
  end.setDate(now.getDate() + 7);
  const endTime = end.toISOString();

  const eventTypeId = 2317091;
  const eventTypeSlug = "ai-voice-agent-demo-meeting";
  const duration = 30;
  const url = `https://api.cal.com/v2/slots/available?startTime=${encodeURIComponent(
    startTime
  )}&endTime=${encodeURIComponent(
    endTime
  )}&eventTypeId=${eventTypeId}&eventTypeSlug=${eventTypeSlug}&duration=${duration}`;

  const options = {
    method: "GET",
    headers: {
      Authorization: `Bearer ${apiToken}`,
      "Content-Type": "application/json",
    },
  };
  try {
    const response = await fetch(url, options);
    const data = (await response.json()) as CalComApiResponse;

    if (data.status === "success") {
      const slotsInIndianTime: Slot[] = [];
      for (const date in data.data.slots) {
        data.data.slots[date].forEach((slot: { time: string }) => {
          // Keep the original UTC time in the slot.time field
          // This ensures we have a proper ISO date string for formatting
          slotsInIndianTime.push({ 
            date, 
            time: slot.time // Keep as ISO string
          });
        });
      }
      return slotsInIndianTime;
    } else {
      throw new Error("Failed to retrieve slots");
    }
  } catch (error) {
    console.error("Error fetching slots:", error);
    throw error;
  }
}

export async function GET(): Promise<Response> {
  try {
    const allAvailableSlots = await fetchAvailableSlots();
    const formattedSlots: FormattedSlot[] = allAvailableSlots.map((slot) => ({
      ...slot,
      formattedTime: formatToConversationalDate(slot.time),
    }));

    return new Response(
      JSON.stringify({ status: "success", slots: formattedSlots }),
      {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({
        status: "error",
        message: "Failed to fetch slots",
        error,
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
}
