import { createClient } from "@supabase/supabase-js";

const supabaseUrl = "https://inqgiiaeasmwpqkqhufr.supabase.co"; // Replace with your Supabase URL
const supabaseAnonKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlucWdpaWFlYXNtd3Bxa3FodWZyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDAyNTI4MjEsImV4cCI6MjA1NTgyODgyMX0.i9GLEbQ_35saXg7yTZti3z-rwhTKu2U3Zk8f2Gpgw_U"; // Replace with your Supabase Anon Key

const supabase = createClient(supabaseUrl, supabaseAnonKey);

export const fetchBracketData = async (conference) => {
    try {
        const { data, error } = await supabase
            .from("bracket_json")
            .select("*")
            .eq("conference", conference);

        if (error) throw error;
        return data.length ? data[0].bracket_data : [];
    } catch (error) {
        console.error("Error fetching bracket data:", error);
        return [];
    }
};

export const fetchUserPicks = async (userId, conference) => {
    try {
        const { data, error } = await supabase
            .from("predictions")
            .select("*")
            .eq("user_id", userId)
            .eq("conference", conference);

        if (error) throw error;
        let picks = {};
        data.forEach((pick) => {
            picks[pick.game_id] = pick.predicted_winner;
        });

        return picks;
    } catch (error) {
        console.error("Error fetching user picks:", error);
        return {};
    }
};

export const submitPicks = async (userId, conference, picks) => {
    try {
        const pickArray = Object.entries(picks).map(([game_id, predicted_winner]) => ({
            user_id: userId,
            conference,
            game_id: parseInt(game_id),
            predicted_winner
        }));

        const { error } = await supabase.from("predictions").upsert(pickArray, { onConflict: ["user_id", "game_id", "conference"] });

        if (error) throw error;
    } catch (error) {
        console.error("Error submitting picks:", error);
    }
};

export const fetchUser = async () => {
    try {
        const { data, error } = await supabase.auth.getUser();
        if (error) throw error;
        return data ? data.user : null;
    } catch (error) {
        console.error("Error fetching user:", error);
        return null;
    }
};

export async function fetchRegionalChampions(userId) {
  try {
    const { data, error } = await supabase
      .from('predictions')
      .select('game_id, predicted_winner')
      .eq('user_id', userId)
      .in('conference', ['NCAA_Region_1', 'NCAA_Region_2', 'NCAA_Region_3', 'NCAA_Region_4']);

    if (error) {
      console.error("Error fetching regional champions:", error);
      return {};
    }

    const champions = {};
    data.forEach((pick) => {
      champions[pick.game_id] = pick.predicted_winner;
    });

    return champions;
  } catch (err) {
    console.error("Unexpected error fetching regional champions:", err);
    return {};
  }
}
