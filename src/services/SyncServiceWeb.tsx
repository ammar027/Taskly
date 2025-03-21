import React, { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { Platform } from "react-native";

export default function SyncServiceWeb({ userId, noteService }) {
  const [subscribed, setSubscribed] = useState(false);

  // Set up Supabase realtime subscription to listen for changes
  useEffect(() => {
    if (!userId || subscribed || Platform.OS !== 'web') return;

    // Subscribe to changes on the notes table for this user
    const subscription = supabase
      .channel("notes_changes")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "notes",
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          console.log("Received change from Supabase:", payload);
          
          // Clear the note service cache to force a fresh fetch on next query
          if (noteService && typeof noteService.clearCache === 'function') {
            noteService.clearCache();
          }
        }
      )
      .subscribe(() => {
        console.log("Supabase realtime subscription established");
        setSubscribed(true);
      });

    return () => {
      supabase.removeChannel(subscription);
      setSubscribed(false);
    };
  }, [userId, noteService]);

  // This component doesn't render anything visible
  return null;
}