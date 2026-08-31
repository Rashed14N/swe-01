export interface PresetAvatar {
  id: string;
  name: string;
  category: 'animals' | 'nature' | 'creatures' | 'items' | 'student' | 'coder';
  url: string;
  fileName: string;
}

export const PRESET_AVATARS: PresetAvatar[] = [
  {
    id: 'pangolin-cream-2',
    name: 'Pangolin Cream',
    category: 'animals',
    fileName: 'pangolin-cream-2.png',
    url: '/avatars/pangolin-cream-2.svg',
  },
  {
    id: 'gentle-squirrel',
    name: 'Gentle Squirrel',
    category: 'animals',
    fileName: 'gentle-squirrel.png',
    url: '/avatars/gentle-squirrel.svg',
  },
  {
    id: 'fox-terracotta',
    name: 'Fox Terracotta',
    category: 'animals',
    fileName: 'fox-terracotta.png',
    url: '/avatars/fox-terracotta.svg',
  },
  {
    id: 'public-fountain',
    name: 'Public Fountain',
    category: 'items',
    fileName: 'public-fountain.png',
    url: '/avatars/public-fountain.svg',
  },
  {
    id: 'calculator-4',
    name: 'Calculator',
    category: 'items',
    fileName: 'calculator-4.png',
    url: '/avatars/calculator-4.svg',
  },
  {
    id: 'goat-3',
    name: 'Playful Goat',
    category: 'animals',
    fileName: 'goat-3.png',
    url: '/avatars/goat-3.svg',
  },
  {
    id: 'compact-chick',
    name: 'Compact Chick',
    category: 'animals',
    fileName: 'compact-chick.png',
    url: '/avatars/compact-chick.svg',
  },
  {
    id: 'numbat-3',
    name: 'Banded Numbat',
    category: 'animals',
    fileName: 'numbat-3.png',
    url: '/avatars/numbat-3.svg',
  },
  {
    id: 'proboscis-monkey',
    name: 'Proboscis Monkey',
    category: 'animals',
    fileName: 'proboscis-monkey.png',
    url: '/avatars/proboscis-monkey.svg',
  },
  {
    id: 'moonrat',
    name: 'Moonrat',
    category: 'creatures',
    fileName: 'moonrat.png',
    url: '/avatars/moonrat.svg',
  },
  {
    id: 'water-drop',
    name: 'Dew Water Drop',
    category: 'nature',
    fileName: 'water-drop.png',
    url: '/avatars/water-drop.svg',
  },
  {
    id: 'peanut',
    name: 'Golden Peanut',
    category: 'nature',
    fileName: 'peanut.png',
    url: '/avatars/peanut.svg',
  },
  {
    id: 'penguin-4',
    name: 'Arctic Penguin',
    category: 'animals',
    fileName: 'penguin-4.png',
    url: '/avatars/penguin-4.svg',
  },
  {
    id: 'domestic-shorthair-tabby-cat-2',
    name: 'Tabby Shorthair Cat',
    category: 'animals',
    fileName: 'domestic-shorthair-tabby-cat-2.png',
    url: '/avatars/domestic-shorthair-tabby-cat-2.svg',
  },
  {
    id: 'giant-clam',
    name: 'Giant Pearl Clam',
    category: 'nature',
    fileName: 'giant-clam.png',
    url: '/avatars/giant-clam.svg',
  },
  {
    id: 'globe',
    name: 'Global Sphere',
    category: 'items',
    fileName: 'globe.png',
    url: '/avatars/globe.svg',
  },
  {
    id: 'binoculars-6',
    name: 'Field Binoculars',
    category: 'items',
    fileName: 'binoculars-6.png',
    url: '/avatars/binoculars-6.svg',
  },
  {
    id: 'koala-8',
    name: 'Koala Leaf',
    category: 'animals',
    fileName: 'koala-8.png',
    url: '/avatars/koala-8.svg',
  },
  {
    id: 'crab',
    name: 'Coral Crab',
    category: 'animals',
    fileName: 'crab.png',
    url: '/avatars/crab.svg',
  },
  {
    id: 'fennec-fox',
    name: 'Fennec Fox',
    category: 'animals',
    fileName: 'fennec-fox.png',
    url: '/avatars/fennec-fox.svg',
  },
  {
    id: 'desert-rain-frog',
    name: 'Desert Rain Frog',
    category: 'creatures',
    fileName: 'desert-rain-frog.png',
    url: '/avatars/desert-rain-frog.svg',
  },
  {
    id: 'camera',
    name: 'Retro Camera',
    category: 'items',
    fileName: 'camera.png',
    url: '/avatars/camera.svg',
  },
  {
    id: 'dew-drop-nymph',
    name: 'Dew Drop Nymph',
    category: 'creatures',
    fileName: 'dew-drop-nymph.png',
    url: '/avatars/dew-drop-nymph.svg',
  },
  {
    id: 'gentle-fox',
    name: 'Gentle Fox',
    category: 'animals',
    fileName: 'gentle-fox.png',
    url: '/avatars/gentle-fox.svg',
  },
  {
    id: 'maltese-2',
    name: 'Maltese Puppy',
    category: 'animals',
    fileName: 'maltese-2.png',
    url: '/avatars/maltese-2.svg',
  },
  {
    id: 'dik-dik-3',
    name: 'Mini Dik-Dik',
    category: 'animals',
    fileName: 'dik-dik-3.png',
    url: '/avatars/dik-dik-3.svg',
  },
  {
    id: 'lightbulb-3',
    name: 'Idea Lightbulb',
    category: 'items',
    fileName: 'lightbulb-3.png',
    url: '/avatars/lightbulb-3.svg',
  },
  {
    id: 'frog-10',
    name: 'Tree Frog',
    category: 'animals',
    fileName: 'frog-10.png',
    url: '/avatars/frog-10.svg',
  },
  {
    id: 'koala-3',
    name: 'Sleepy Koala',
    category: 'animals',
    fileName: 'koala-3.png',
    url: '/avatars/koala-3.svg',
  },
  {
    id: 'binoculars',
    name: 'Explorer Binoculars',
    category: 'items',
    fileName: 'binoculars.png',
    url: '/avatars/binoculars.svg',
  },
  {
    id: 'rambutan',
    name: 'Sweet Rambutan',
    category: 'nature',
    fileName: 'rambutan.png',
    url: '/avatars/rambutan.svg',
  },
  {
    id: 'garden-eel-2',
    name: 'Garden Eel',
    category: 'creatures',
    fileName: 'garden-eel-2.png',
    url: '/avatars/garden-eel-2.svg',
  },
  {
    id: 'raccoon-close-set-eyes-left',
    name: 'Curious Raccoon',
    category: 'animals',
    fileName: 'raccoon-close-set-eyes-left.png',
    url: '/avatars/raccoon-close-set-eyes-left.svg',
  },
  {
    id: 'curious-deer',
    name: 'Curious Deer',
    category: 'animals',
    fileName: 'curious-deer.png',
    url: '/avatars/curious-deer.svg',
  },
  {
    id: 'pocket-watch-2',
    name: 'Pocket Watch',
    category: 'items',
    fileName: 'pocket-watch-2.png',
    url: '/avatars/pocket-watch-2.svg',
  },
  {
    id: 'handpan',
    name: 'Handpan Music',
    category: 'items',
    fileName: 'handpan.png',
    url: '/avatars/handpan.svg',
  },
  {
    id: 'giraffe',
    name: 'Savannah Giraffe',
    category: 'animals',
    fileName: 'giraffe.png',
    url: '/avatars/giraffe.svg',
  },
  {
    id: 'barrel-cactus-pup',
    name: 'Barrel Cactus Pup',
    category: 'nature',
    fileName: 'barrel-cactus-pup.png',
    url: '/avatars/barrel-cactus-pup.svg',
  }
];

export const DEFAULT_AVATAR_URL = PRESET_AVATARS[0]?.url || '/avatars/pangolin-cream-2.svg';

/**
 * Resolve avatar url: returns existing user.profileImage ONLY if it matches the uploaded presets or data:image, otherwise returns the default preset avatar
 */
export function getUserAvatarUrl(user?: { name?: string; studentId?: string; profileImage?: string } | null): string {
  if (!user || !user.profileImage) {
    return DEFAULT_AVATAR_URL;
  }

  const img = user.profileImage.trim();

  // If user uploaded a custom base64 image
  if (img.startsWith('data:image/')) {
    return img;
  }

  // If user has a local /avatars/ path that exists in presets
  if (img.startsWith('/avatars/')) {
    const foundByUrl = PRESET_AVATARS.find(a => a.url === img);
    if (foundByUrl) return foundByUrl.url;
  }

  // Check if profileImage is an avatar ID or filename (e.g. 'pangolin-cream-2' or 'pangolin-cream-2.png' or 'pangolin-cream-2.svg')
  const found = PRESET_AVATARS.find(a => 
    a.id === img || 
    a.fileName === img ||
    a.url === img ||
    img.includes(a.id)
  );

  if (found) {
    return found.url;
  }

  // Discard any external random / unsplash / dicebear avatars and return default
  return DEFAULT_AVATAR_URL;
}
