export enum Language {
  TH = 'th',
  EN = 'en'
}

export enum UserRole {
  USER = 'user',
  ADMIN = 'admin',
  DRIVER = 'driver'
}

export interface User {
  id: string;
  employeeId: string;
  name: string;
  department: string;
  phone: string;
  role: UserRole;
}

export interface RouteOption {
  id: string;
  name: string;
  routeName: string; // ชื่อสายรถ เช่น "สายสระบุรี"
  time: string;
  direction: 'inbound' | 'outbound'; // ขารับ หรือ ขาส่ง
  type: 'morning' | 'evening' | 'night';
  maxSeats: number;
  description?: string;
  stationIds?: string[]; // เพิ่มบรรทัดนี้
}

export interface Station {
  id: string;
  name: string;
  lat: number;
  lng: number;
  description: string;
}

export enum BookingStatus {
  BOOKED = 'BOOKED',
  WAITING = 'WAITING',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED',
  NOSHOW = 'NOSHOW'
}

export interface Booking {
  id: string;
  userId: string;
  userName: string; // Denormalized for export ease
  routeId: string;
  routeName: string;
  stationId: string;
  stationName: string;
  timestamp: number;
  status: BookingStatus;
  checkInTime?: number;
  shift?: 'morning' | 'night';
  direction?: 'inbound' | 'outbound';
}