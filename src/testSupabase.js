import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://inqgiiaeasmwpqkqhufr.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlucWdpaWFlYXNtd3Bxa3FodWZyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDAyNTI4MjEsImV4cCI6MjA1NTgyODgyMX0.i9GLEbQ_35saXg7yTZti3z-rwhTKu2U3Zk8f2Gpgw_U';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

const fetchBracket = async () => {
    const { data, error } = await supabase
        .from('bracket_json')
        .select('*')
        .eq('conference', 'Final_4');

    if (error) {
        console.error("Error fetching Final_4 bracket:", error);
    } else {
        console.log("Final_4 Bracket Data:", data);
    }
};

fetchBracket();
