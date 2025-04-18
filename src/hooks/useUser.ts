import { useState, useEffect } from 'react';
import { User } from '@/types';
import { generateFingerprint } from '@/utils/fingerprint';
import { generateAvatar } from '@/utils/avatarGenerator';
import { getUser, saveUser, incrementUniqueUsers, initStats, getStats } from '@/utils/db';

export const useUser = () => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [uniqueUsers, setUniqueUsers] = useState(0);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    const initUser = async () => {
      try {
        setIsLoading(true);
        
        // Initialize stats
        await initStats();
        
        // Get user fingerprint
        const fingerprint = generateFingerprint();
        
        // Try to get existing user
        let isNewUser = false;
        let user: User | undefined;
        
        try {
          const existingUser = await getUser(fingerprint);
          if (existingUser) {
            user = existingUser;
          } else {
            isNewUser = true;
          }
        } catch (err) {
          // User doesn't exist, we'll create a new one
          isNewUser = true;
        }
        
        // Create a new user if needed
        if (isNewUser) {
          const avatarUrl = generateAvatar(fingerprint);
          const newUser: User = {
            id: fingerprint,
            avatarUrl,
            createdAt: Date.now()
          };
          
          // Save the user
          await saveUser(newUser);
          
          // Increment unique users count
          await incrementUniqueUsers();
          user = newUser;
        }
        
        // Get updated stats to display correct user count
        try {
          const stats = await getStats();
          if (stats && stats.uniqueUsers) {
            setUniqueUsers(stats.uniqueUsers);
          }
        } catch (err) {
          console.error('Error getting stats:', err);
        }
        
        if (user) {
          setCurrentUser(user);
        }
      } catch (err) {
        console.error('Error initializing user:', err);
        setError(err as Error);
      } finally {
        setIsLoading(false);
      }
    };
    
    initUser();
  }, []);

  return { currentUser, isLoading, error, uniqueUsers };
};
