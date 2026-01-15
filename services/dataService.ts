import { User, Booking, RouteOption, Station, BookingStatus, UserRole } from '../types';
import { ROUTES_DATA, STATIONS_DATA } from '../constants';
import { supabase } from '../lib/supabase';

const KEYS = {
  USER: 'shuttle_user',
  BOOKINGS: 'shuttle_bookings',
  REGISTERED_USERS: 'shuttle_registered_users',
  ROUTES: 'shuttle_routes_config',
  NEWS: 'shuttle_news_content',
};

// --- Session Management ---
export const getStoredUser = (): User | null => {
  const data = localStorage.getItem(KEYS.USER);
  return data ? JSON.parse(data) : null;
};

export const saveUser = (user: User) => {
  localStorage.setItem(KEYS.USER, JSON.stringify(user));
};

export const logoutUser = () => {
  localStorage.removeItem(KEYS.USER);
};

// --- User Database Management (Supabase) ---
export const registerUser = async (user: User): Promise<boolean> => {
  try {
    // Check if user already exists
    const { data: existing } = await supabase
      .from('users')
      .select('id')
      .eq('employee_id', user.employeeId)
      .single();

    if (existing) {
      return false;
    }

    // Insert new user
    const { error } = await supabase.from('users').insert({
      employee_id: user.employeeId,
      name: user.name,
      department: user.department,
      phone: user.phone,
      role: user.role.toUpperCase(),
    });

    return !error;
  } catch {
    return false;
  }
};

export const loginAuth = async (empId: string): Promise<User | null> => {
  // Admin backdoor
  if (empId === '9999') {
    return {
      id: '9999',
      employeeId: '9999',
      name: 'Admin System',
      department: 'IT',
      phone: '0000',
      role: UserRole.ADMIN
    };
  }

  // Driver backdoor
  if (empId === '8888') {
    return {
      id: '8888',
      employeeId: '8888',
      name: 'Driver Staff',
      department: 'Transport',
      phone: '081-234-5678',
      role: UserRole.DRIVER
    };
  }

  try {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('employee_id', empId)
      .single();

    if (error || !data) {
      return null;
    }

    return {
      id: data.id,
      employeeId: data.employee_id,
      name: data.name,
      department: data.department,
      phone: data.phone,
      role: data.role?.toLowerCase() as UserRole || UserRole.USER,
    };
  } catch {
    return null;
  }
};

// --- Route Management (Supabase + Constants fallback) ---
export const getRoutes = async (): Promise<RouteOption[]> => {
  try {
    // ดึงข้อมูลจาก Supabase routes table
    const { data: routesData } = await supabase
      .from('routes')
      .select('*')
      .order('time', { ascending: true });

    // ดึงข้อมูล route_details สำหรับ licensePlate และ driverPhone
    const { data: details } = await supabase
      .from('route_details')
      .select('*');

    // ถ้ามีข้อมูลใน Supabase ใช้ข้อมูลนั้น
    if (routesData && routesData.length > 0) {
      return routesData.map(r => {
        const detail = details?.find(d => d.route_id === r.id);
        return {
          id: r.id,
          name: r.name,
          time: r.time,
          type: r.type as 'morning' | 'evening' | 'night',
          description: r.description || undefined,
          maxSeats: r.max_seats || 40,
          licensePlate: detail?.license_plate || undefined,
          driverPhone: detail?.driver_phone || undefined,
        };
      });
    }

    // Fallback to constants
    return ROUTES_DATA.map(route => {
      const detail = details?.find(d => d.route_id === route.id);
      if (detail) {
        return {
          ...route,
          licensePlate: detail.license_plate || undefined,
          driverPhone: detail.driver_phone || undefined,
        };
      }
      return route;
    });
  } catch {
    return ROUTES_DATA;
  }
};

export const saveRoutes = async (routes: RouteOption[]): Promise<void> => {
  try {
    // บันทึกเฉพาะ routes ที่มี licensePlate หรือ driverPhone
    for (const route of routes) {
      if (route.licensePlate || route.driverPhone) {
        const { data: existing } = await supabase
          .from('route_details')
          .select('id')
          .eq('route_id', route.id)
          .single();

        if (existing) {
          await supabase
            .from('route_details')
            .update({
              license_plate: route.licensePlate || null,
              driver_phone: route.driverPhone || null,
              updated_at: new Date().toISOString()
            })
            .eq('route_id', route.id);
        } else {
          await supabase.from('route_details').insert({
            route_id: route.id,
            license_plate: route.licensePlate || null,
            driver_phone: route.driverPhone || null,
          });
        }
      }
    }
  } catch {
    // Fallback to localStorage
    localStorage.setItem(KEYS.ROUTES, JSON.stringify(routes));
  }
};

export const getRouteById = async (id: string): Promise<RouteOption | undefined> => {
  const routes = await getRoutes();
  return routes.find(r => r.id === id);
};

// สร้าง/อัพเดท route
export const saveRoute = async (route: RouteOption): Promise<boolean> => {
  try {
    const { data: existing } = await supabase
      .from('routes')
      .select('id')
      .eq('id', route.id)
      .single();

    if (existing) {
      await supabase
        .from('routes')
        .update({
          name: route.name,
          time: route.time,
          type: route.type,
          description: route.description || null,
          max_seats: route.maxSeats,
          updated_at: new Date().toISOString()
        })
        .eq('id', route.id);
    } else {
      await supabase.from('routes').insert({
        id: route.id,
        name: route.name,
        time: route.time,
        type: route.type,
        description: route.description || null,
        max_seats: route.maxSeats,
      });
    }
    return true;
  } catch {
    return false;
  }
};

// ลบ route
export const deleteRoute = async (routeId: string): Promise<boolean> => {
  try {
    await supabase.from('routes').delete().eq('id', routeId);
    await supabase.from('route_details').delete().eq('route_id', routeId);
    return true;
  } catch {
    return false;
  }
};

// --- Station Management (Supabase + Constants fallback) ---
export const getStations = async (): Promise<Station[]> => {
  try {
    const { data } = await supabase
      .from('stations')
      .select('*')
      .order('name', { ascending: true });

    if (data && data.length > 0) {
      return data.map(s => ({
        id: s.id,
        name: s.name,
        lat: s.lat,
        lng: s.lng,
        description: s.description || '',
      }));
    }
    return STATIONS_DATA;
  } catch {
    return STATIONS_DATA;
  }
};

// สร้าง/อัพเดท station
export const saveStation = async (station: Station): Promise<boolean> => {
  try {
    const { data: existing } = await supabase
      .from('stations')
      .select('id')
      .eq('id', station.id)
      .single();

    if (existing) {
      await supabase
        .from('stations')
        .update({
          name: station.name,
          lat: station.lat,
          lng: station.lng,
          description: station.description,
          updated_at: new Date().toISOString()
        })
        .eq('id', station.id);
    } else {
      await supabase.from('stations').insert({
        id: station.id,
        name: station.name,
        lat: station.lat,
        lng: station.lng,
        description: station.description,
      });
    }
    return true;
  } catch {
    return false;
  }
};

// ลบ station
export const deleteStation = async (stationId: string): Promise<boolean> => {
  try {
    await supabase.from('stations').delete().eq('id', stationId);
    return true;
  } catch {
    return false;
  }
};

// --- News Management (Supabase) ---
export const getNews = async (): Promise<string> => {
  try {
    const { data, error } = await supabase
      .from('news')
      .select('content')
      .order('updated_at', { ascending: false })
      .limit(1)
      .single();

    if (error || !data) {
      return "The Ayutthaya route will be delayed by 10 mins on Friday due to road maintenance.";
    }
    return data.content;
  } catch {
    return "The Ayutthaya route will be delayed by 10 mins on Friday due to road maintenance.";
  }
};

export const saveNews = async (content: string): Promise<void> => {
  try {
    // Update the first news record or insert new one
    const { data: existing } = await supabase
      .from('news')
      .select('id')
      .limit(1)
      .single();

    if (existing) {
      await supabase
        .from('news')
        .update({ content, updated_at: new Date().toISOString() })
        .eq('id', existing.id);
    } else {
      await supabase.from('news').insert({ content });
    }
  } catch {
    // Fallback to localStorage
    localStorage.setItem(KEYS.NEWS, content);
  }
};

// --- Booking Management (Supabase) ---
export const getBookings = async (): Promise<Booking[]> => {
  try {
    const { data, error } = await supabase
      .from('bookings')
      .select('*')
      .order('timestamp', { ascending: false });

    if (error || !data) {
      return [];
    }

    return data.map(b => ({
      id: b.id,
      userId: b.user_id,
      userName: b.user_name || '',
      routeId: b.route_id,
      routeName: b.route_name || '',
      stationId: b.station_id || '',
      stationName: b.station_name || '',
      timestamp: b.timestamp,
      status: b.status as BookingStatus,
      checkInTime: b.check_in_time ? new Date(b.check_in_time).getTime() : undefined,
      shift: b.shift,
      direction: b.direction,
    }));
  } catch {
    return [];
  }
};

export const getUserBookings = async (userId: string): Promise<Booking[]> => {
  try {
    const { data, error } = await supabase
      .from('bookings')
      .select('*')
      .eq('user_id', userId)
      .order('timestamp', { ascending: false });

    if (error || !data) {
      return [];
    }

    return data.map(b => ({
      id: b.id,
      userId: b.user_id,
      userName: b.user_name || '',
      routeId: b.route_id,
      routeName: b.route_name || '',
      stationId: b.station_id || '',
      stationName: b.station_name || '',
      timestamp: b.timestamp,
      status: b.status as BookingStatus,
      checkInTime: b.check_in_time ? new Date(b.check_in_time).getTime() : undefined,
      shift: b.shift,
      direction: b.direction,
    }));
  } catch {
    return [];
  }
};

export const saveBooking = async (booking: Booking): Promise<boolean> => {
  try {
    const { error } = await supabase.from('bookings').insert({
      user_id: booking.userId,
      user_name: booking.userName,
      route_id: booking.routeId,
      route_name: booking.routeName,
      station_id: booking.stationId,
      station_name: booking.stationName,
      timestamp: booking.timestamp,
      status: booking.status,
      shift: booking.shift,
      direction: booking.direction,
    });
    return !error;
  } catch {
    return false;
  }
};

export const updateBookingStatus = async (id: string, status: BookingStatus): Promise<void> => {
  try {
    const updateData: Record<string, unknown> = { status };
    if (status === BookingStatus.COMPLETED) {
      updateData.check_in_time = new Date().toISOString();
    }

    await supabase
      .from('bookings')
      .update(updateData)
      .eq('id', id);
  } catch {
    // Silent fail
  }
};

export const getRouteSeatCount = async (routeId: string): Promise<number> => {
  try {
    const { count, error } = await supabase
      .from('bookings')
      .select('*', { count: 'exact', head: true })
      .eq('route_id', routeId)
      .in('status', [BookingStatus.BOOKED, BookingStatus.WAITING]);

    if (error) return 0;
    return count || 0;
  } catch {
    return 0;
  }
};

export const getUserActiveBooking = async (userId: string): Promise<Booking | undefined> => {
  try {
    const { data, error } = await supabase
      .from('bookings')
      .select('*')
      .eq('user_id', userId)
      .in('status', [BookingStatus.BOOKED, BookingStatus.WAITING])
      .limit(1)
      .single();

    if (error || !data) {
      return undefined;
    }

    return {
      id: data.id,
      userId: data.user_id,
      userName: data.user_name || '',
      routeId: data.route_id,
      routeName: data.route_name || '',
      stationId: data.station_id || '',
      stationName: data.station_name || '',
      timestamp: data.timestamp,
      status: data.status as BookingStatus,
      checkInTime: data.check_in_time ? new Date(data.check_in_time).getTime() : undefined,
      shift: data.shift,
      direction: data.direction,
    };
  } catch {
    return undefined;
  }
};