
// Generate an avatar URL using DiceBear
export const generateAvatar = (seed: string): string => {
  // We'll use DiceBear's "avatars" collection to generate an avatar based on the seed
  return `https://api.dicebear.com/7.x/fun-emoji/svg?seed=${encodeURIComponent(seed)}`;
};
