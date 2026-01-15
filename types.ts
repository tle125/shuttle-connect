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
  time: string;
  type: 'morning' | 'evening' | 'night';
  description?: string;
  maxSeats: number;
  price?: number;
  licensePlate?: string;
  driverPhone?: string;
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