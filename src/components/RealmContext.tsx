import React, { createContext, useContext, useEffect, useState } from 'react';
import Realm from 'realm';
import { NoteSchema } from '@/models/NoteSchema';

// Create context
const RealmContext = createContext(null);

// Custom hook for using Realm
export const useRealm = () => {
  const context = useContext(RealmContext);
  if (context === null) {
    throw new Error('useRealm must be used within a RealmProvider');
  }
  return context;
};

export const RealmProvider = ({ children }) => {
  const [realm, setRealm] = useState(null);

  useEffect(() => {
    // Open the Realm database
    const openRealm = async () => {
      try {
        const realmInstance = await Realm.open({
          schema: [NoteSchema],
          schemaVersion: 1,
        });
        
        setRealm(realmInstance);
        console.log('Realm opened successfully');
      } catch (error) {
        console.error('Failed to open Realm', error);
      }
    };

    openRealm();

    // Close the realm when the component unmounts
    return () => {
      if (realm) {
        realm.close();
        console.log('Realm closed');
      }
    };
  }, []);

  // Don't render children until Realm is initialized
  if (!realm) {
    return null; // Or return a loading indicator
  }

  return (
    <RealmContext.Provider value={realm}>
      {children}
    </RealmContext.Provider>
  );
};