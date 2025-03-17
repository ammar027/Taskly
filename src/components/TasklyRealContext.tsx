import React, { createContext, useContext, useEffect, useState } from 'react';
import Realm from 'realm';
import { TaskSchema } from '@/Realm/TaskSchema';
import { CategorySchema } from '@/Realm/CategorySchema';

// Create context
const RealmContext = createContext<Realm | null>(null);

// Custom hook for using Realm
export const useRealm = () => {
  const context = useContext(RealmContext);
  if (context === null) {
    throw new Error('useRealm must be used within a RealmProvider');
  }
  return context;
};

interface RealmProviderProps {
  children: React.ReactNode;
}

export const RealmProvider: React.FC<RealmProviderProps> = ({ children }) => {
  const [realm, setRealm] = useState<Realm | null>(null);

  useEffect(() => {
    // Open the Realm database
    const openRealm = async () => {
      try {
        const realmInstance = await Realm.open({
          schema: [TaskSchema, CategorySchema],
          schemaVersion: 1,
        });
        
        setRealm(realmInstance);
      } catch (error) {
        console.error('Failed to open Realm', error);
      }
    };

    openRealm();

    // Close the realm when the component unmounts
    return () => {
      if (realm) {
        realm.close();
      }
    };
  }, []);

  // Don't render children until Realm is initialized
  if (!realm) {
    return null;
  }

  return (
    <RealmContext.Provider value={realm}>
      {children}
    </RealmContext.Provider>
  );
};