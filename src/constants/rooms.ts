export interface RoomCategory {
  category: string;
  rooms: string[];
}

export const ALL_ROOMS = [
  // 2nd Floor (201 - 209)
  'Room 201',
  'Room 202',
  'Room 203',
  'Room 204',
  'Room 205',
  'Room 206',
  'Room 207',
  'Room 208',
  'Room 209',

  // 3rd Floor (301 - 309)
  'Room 301',
  'Room 302',
  'Room 303',
  'Room 304',
  'Room 305',
  'Room 306',
  'Room 307',
  'Room 308',
  'Room 309',

  // 4th Floor (401 - 409)
  'Room 401',
  'Room 402',
  'Room 403',
  'Room 404',
  'Room 405',
  'Room 406',
  'Room 407',
  'Room 408',
  'Room 409',

  // 5th Floor (501 - 509)
  'Room 501',
  'Room 502',
  'Room 503',
  'Room 504',
  'Room 505',
  'Room 506',
  'Room 507',
  'Room 508',
  'Room 509',

  // XL Rooms
  'XL 1',
  'XL 2',

  // Extension Rooms
  'Exten-1',
  'Exten-2',
  'Exten-3',
  'Exten-4',
  'Exten-5',

  // Specialized Labs
  'EEE Lab',
] as const;

export const CATEGORIZED_ROOMS: RoomCategory[] = [
  {
    category: '2nd Floor',
    rooms: ['Room 201', 'Room 202', 'Room 203', 'Room 204', 'Room 205', 'Room 206', 'Room 207', 'Room 208', 'Room 209'],
  },
  {
    category: '3rd Floor',
    rooms: ['Room 301', 'Room 302', 'Room 303', 'Room 304', 'Room 305', 'Room 306', 'Room 307', 'Room 308', 'Room 309'],
  },
  {
    category: '4th Floor',
    rooms: ['Room 401', 'Room 402', 'Room 403', 'Room 404', 'Room 405', 'Room 406', 'Room 407', 'Room 408', 'Room 409'],
  },
  {
    category: '5th Floor',
    rooms: ['Room 501', 'Room 502', 'Room 503', 'Room 504', 'Room 505', 'Room 506', 'Room 507', 'Room 508', 'Room 509'],
  },
  {
    category: 'XL Halls',
    rooms: ['XL 1', 'XL 2'],
  },
  {
    category: 'Extension Building',
    rooms: ['Exten-1', 'Exten-2', 'Exten-3', 'Exten-4', 'Exten-5'],
  },
  {
    category: 'Laboratories',
    rooms: ['EEE Lab'],
  },
];

/**
 * Clean a room string to remove extra descriptions like "Network Lab", "Lab", "Class Room"
 */
export function cleanRoomNumber(room: string | undefined | null): string {
  if (!room || !room.trim()) return 'TBA';
  let cleaned = room.trim();
  // Remove trailing descriptions like "Network Lab", "Software Lab", "Hardware Lab", "EEE Lab", "Lab", "Class Room"
  cleaned = cleaned.replace(/\s*[-–(]?\s*(?:network\s+lab|software\s+lab|hardware\s+lab|cse\s+lab|eee\s+lab|lab|class\s*room)\s*\)?$/i, '');
  return cleaned.trim() || room.trim();
}

/**
 * Format a room name cleanly for compact display tags
 */
export function formatRoomTag(room: string): string {
  if (!room) return 'TBA';
  return cleanRoomNumber(room);
}
