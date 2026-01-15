import React, { useState, useEffect, useMemo, useRef } from 'react';
import { HashRouter, Routes, Route, Navigate, useLocation, useNavigate } from 'react-router-dom';
import {
  Bus, Map as MapIcon, User as UserIcon, LogOut, Settings,
  PlusCircle, Search, QrCode, Navigation, Phone, Globe, Menu, X, CheckCircle, AlertTriangle, ArrowRight, ArrowLeft, Sun, Moon, Sunset, Clock, History, Edit, Truck,
  ChevronDown, ChevronUp, Calendar, Check, ChevronLeft, ChevronRight, BarChart as BarChartIcon, Camera, Megaphone, UserX, Users
} from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import jsQR from 'jsqr';
import Swal from 'sweetalert2';

import { User, UserRole, RouteOption, Station, Booking, BookingStatus, Language } from './types';
import { STATIONS_DATA, TRANSLATIONS } from './constants';
import { getStoredUser, saveUser, logoutUser, getBookings, saveBooking, updateBookingStatus, getUserActiveBooking, getRouteSeatCount, registerUser, loginAuth, getUserBookings, getRoutes, saveRoutes, getRouteById, getNews, saveNews } from './services/dataService';
import MapComponent from './components/MapComponent';
import QRCodeGen from './components/QRCodeGen';

// --- Components ---

// Button Component
const Button = ({ children, onClick, variant = 'primary', className = '', disabled = false, fullWidth = false }: any) => {
  const baseStyle = "px-4 py-3 rounded-xl font-medium transition-all active:scale-95 flex items-center justify-center gap-2";
  const variants = {
    primary: "bg-blue-600 text-white shadow-blue-200 shadow-lg hover:bg-blue-700 disabled:bg-blue-300",
    secondary: "bg-white text-gray-700 border border-gray-200 shadow-sm hover:bg-gray-50",
    danger: "bg-red-50 text-red-600 hover:bg-red-100",
    outline: "border-2 border-blue-600 text-blue-600 hover:bg-blue-50"
  };
  
  return (
    <button 
      onClick={onClick} 
      disabled={disabled}
      className={`${baseStyle} ${variants[variant as keyof typeof variants]} ${fullWidth ? 'w-full' : ''} ${className}`}
    >
      {children}
    </button>
  );
};

// Input Component
const Input = ({ label, value, onChange, placeholder, type = "text" }: any) => (
  <div className="mb-4">
    <label className="block text-gray-700 text-sm font-semibold mb-2">{label}</label>
    <input 
      type={type} 
      value={value} 
      onChange={onChange}
      placeholder={placeholder}
      className="w-full px-4 py-3 rounded-xl border border-gray-300 bg-gray-50 text-gray-900 placeholder-gray-400 focus:bg-white focus:border-blue-600 focus:ring-4 focus:ring-blue-500/10 outline-none transition-all shadow-sm"
    />
  </div>
);

// Confirmation Modal Component
const ConfirmationModal = ({ isOpen, onClose, onConfirm, title, message }: any) => {
    if (!isOpen) return null;
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/40 backdrop-blur-sm transition-opacity" onClick={onClose} />
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-xs p-6 relative z-10 animate-in zoom-in-95 duration-200">
                <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mb-4 mx-auto">
                    <AlertTriangle className="text-red-600" size={24} />
                </div>
                <h3 className="text-lg font-bold text-center text-gray-900 mb-2">{title}</h3>
                <p className="text-gray-500 text-center text-sm mb-6">{message}</p>
                <div className="grid grid-cols-2 gap-3">
                    <Button variant="secondary" onClick={onClose}>No</Button>
                    <Button variant="danger" onClick={onConfirm}>Yes, Cancel</Button>
                </div>
            </div>
        </div>
    );
};

// QR Scanner Component
const QRScanner = ({ onScan, onClose }: { onScan: (code: string) => void, onClose: () => void }) => {
    const videoRef = useRef<HTMLVideoElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [error, setError] = useState('');

    useEffect(() => {
        let animationFrameId: number;
        const video = videoRef.current;
        const canvas = canvasRef.current;

        if (!video || !canvas) return;

        const startCamera = async () => {
            try {
                let stream;
                try {
                    stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } });
                } catch (e) {
                    console.warn("Environment camera not found, falling back to default");
                    stream = await navigator.mediaDevices.getUserMedia({ video: true });
                }
                
                video.srcObject = stream;
                video.setAttribute("playsinline", "true"); 
                await video.play();
                requestAnimationFrame(tick);
            } catch (err) {
                setError('Unable to access camera. Please ensure permissions are granted.');
                console.error(err);
            }
        };

        const tick = () => {
            if (video.readyState === video.HAVE_ENOUGH_DATA) {
                canvas.height = video.videoHeight;
                canvas.width = video.videoWidth;
                const ctx = canvas.getContext('2d');
                if (ctx) {
                    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
                    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
                    const code = jsQR(imageData.data, imageData.width, imageData.height, {
                        inversionAttempts: "dontInvert",
                    });

                    if (code && code.data) {
                        onScan(code.data);
                    }
                }
            }
            animationFrameId = requestAnimationFrame(tick);
        };

        startCamera();

        return () => {
            cancelAnimationFrame(animationFrameId);
            if (video.srcObject) {
                (video.srcObject as MediaStream).getTracks().forEach(track => track.stop());
            }
        };
    }, [onScan]);

    return (
        <div className="relative bg-black rounded-xl overflow-hidden shadow-lg mb-6">
            {error ? (
                <div className="p-8 text-white text-center">
                    <AlertTriangle className="mx-auto mb-2 text-red-500" />
                    {error}
                    <Button variant="secondary" onClick={onClose} className="mt-4">Close</Button>
                </div>
            ) : (
                <>
                   <video ref={videoRef} className="w-full object-cover h-64" />
                   <canvas ref={canvasRef} className="hidden" />
                   <div className="absolute inset-0 border-2 border-green-500/50 m-8 rounded-lg pointer-events-none animate-pulse"></div>
                   <div className="absolute bottom-4 left-0 right-0 text-center pointer-events-none">
                       <span className="bg-black/50 text-white text-xs px-3 py-1 rounded-full backdrop-blur-sm">Point camera at QR Code</span>
                   </div>
                   <button onClick={onClose} className="absolute top-2 right-2 bg-black/40 text-white p-2 rounded-full hover:bg-black/60">
                       <X size={20} />
                   </button>
                </>
            )}
        </div>
    );
};

// Route Section Component (Collapsible)
const RouteSection = ({ title, routes, direction, activeBookings, selectedShift, onRouteClick, t, seatCounts }: any) => {
    const [isOpen, setIsOpen] = useState(false); // Default to collapsed

    if (routes.length === 0) return null;

    // Custom Styling
    const isPickup = direction === 'inbound';
    // Colors: Pick-up (Blue-600), Drop-off (Orange-500 for contrast)
    const headerClass = isPickup
        ? "bg-blue-600 text-white shadow-blue-200"
        : "bg-orange-500 text-white shadow-orange-200";

    return (
        <div className="mb-4">
            <button
                onClick={() => setIsOpen(!isOpen)}
                className={`w-full flex items-center justify-between gap-3 mb-3 px-4 py-3 rounded-xl shadow-lg hover:brightness-110 transition-all group select-none ${headerClass}`}
            >
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-white/20 rounded-lg">
                        <Clock size={20} className="text-white" />
                    </div>
                    <h3 className="text-sm font-bold uppercase tracking-wide">{title}</h3>
                    <span className="text-xs px-2.5 py-0.5 rounded-full font-bold ml-1 bg-white/20 text-white">
                        {routes.length}
                    </span>
                </div>
                <div className="text-white/80 group-hover:text-white transition-colors">
                    {isOpen ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                </div>
            </button>

            {isOpen && (
                <div className="space-y-3 animate-in slide-in-from-top-2 fade-in duration-200 pb-2">
                    {routes.map((route: any) => {
                        const seatsTaken = seatCounts[route.id] || 0;
                        const isFull = seatsTaken >= route.maxSeats;

                        return (
                            <div
                                key={route.id}
                                onClick={() => !isFull && onRouteClick(route, direction)}
                                className={`bg-white p-4 rounded-xl border shadow-sm flex justify-between items-center transition-all
                                    ${isFull ? 'opacity-60 grayscale cursor-not-allowed border-gray-100' :
                                      'active:scale-95 cursor-pointer hover:shadow-md border-gray-100 hover:border-blue-200'
                                    }`}
                            >
                                <div>
                                    <h3 className="font-bold text-gray-800">{route.name}</h3>
                                    <div className="text-sm text-gray-500 mt-1 flex items-center gap-2">
                                        <span className={`font-mono px-2 py-0.5 rounded text-xs font-bold ${isFull ? 'bg-gray-200' : 'bg-blue-100 text-blue-700'}`}>
                                            {route.time}
                                        </span>
                                        {route.description && <span className="text-xs text-gray-400">({route.description})</span>}
                                    </div>
                                    {(route.licensePlate) && (
                                         <div className="mt-2 inline-block bg-gray-100 px-2 py-0.5 rounded text-xs font-mono font-bold text-gray-600">
                                            {route.licensePlate}
                                         </div>
                                    )}
                                </div>
                                <div className="text-right">
                                    {isFull ? (
                                        <div className="text-red-500 font-bold text-xs">{t.full}</div>
                                    ) : (
                                        <>
                                            <div className={`text-xl font-bold text-green-500`}>
                                                {route.maxSeats - seatsTaken}
                                            </div>
                                            <div className="text-xs text-gray-400">{t.seats} left</div>
                                        </>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
};

// --- Pages ---

// Login Page
const Login = ({ onLogin, lang }: any) => {
  const t = TRANSLATIONS[lang as Language];
  const [isRegister, setIsRegister] = useState(false);
  
  // States
  const [empId, setEmpId] = useState('');
  const [name, setName] = useState('');
  const [dept, setDept] = useState('');
  const [phone, setPhone] = useState('');

  const handleSubmit = async () => {
    if (!empId) {
        Swal.fire({ icon: 'error', text: 'Please enter Employee ID', confirmButtonColor: '#2563eb' });
        return;
    }

    if (isRegister) {
        // Registration Flow
        if (!name || !dept || !phone) {
             Swal.fire({ icon: 'warning', text: t.fillAll, confirmButtonColor: '#f59e0b' });
             return;
        }

        const newUser: User = {
            id: empId, // simple ID mapping
            employeeId: empId,
            name,
            department: dept,
            phone,
            role: UserRole.USER
        };

        const success = await registerUser(newUser);
        if (success) {
            Swal.fire({
                icon: 'success',
                title: 'Welcome!',
                text: t.registerSuccess,
                timer: 1500,
                showConfirmButton: false
            }).then(() => onLogin(newUser));
        } else {
            Swal.fire({ icon: 'error', text: t.userExists, confirmButtonColor: '#ef4444' });
        }

    } else {
        // Login Flow
        const user = await loginAuth(empId);
        if (user) {
            const Toast = Swal.mixin({
                toast: true,
                position: 'top-end',
                showConfirmButton: false,
                timer: 3000,
                timerProgressBar: true,
            });
            Toast.fire({ icon: 'success', title: `${t.hello} ${user.name}` });
            onLogin(user);
        } else {
            Swal.fire({ icon: 'error', text: t.userNotFound, confirmButtonColor: '#ef4444' });
        }
    }
  };

  return (
    <div className="min-h-screen bg-blue-50 flex flex-col items-center justify-center p-6">
      <div className="bg-white p-8 rounded-3xl shadow-xl w-full max-w-sm transition-all duration-300">
        <div className="flex justify-center mb-6">
          <div className="bg-blue-100 p-4 rounded-full shadow-inner">
            <Bus className="w-12 h-12 text-blue-600" />
          </div>
        </div>
        <h1 className="text-2xl font-bold text-center text-gray-800 mb-1">ระบบจองรถรับ-ส่ง</h1>
        <p className="text-center text-gray-500 mb-8">{isRegister ? t.register : t.login}</p>
        
        <div className="space-y-2">
            <Input label={t.empId} value={empId} onChange={(e: any) => setEmpId(e.target.value)} placeholder="e.g., 1234" />
            
            {isRegister && (
                <div className="animate-in fade-in slide-in-from-top-4 duration-300 space-y-2">
                    <Input label={t.fullName} value={name} onChange={(e: any) => setName(e.target.value)} placeholder="e.g., John Doe" />
                    <Input label={t.dept} value={dept} onChange={(e: any) => setDept(e.target.value)} placeholder="e.g., IT" />
                    <Input label={t.phone} value={phone} onChange={(e: any) => setPhone(e.target.value)} placeholder="e.g., 0812345678" type="tel" />
                </div>
            )}
        </div>
        
        <div className="mt-6 space-y-4">
            <Button fullWidth onClick={handleSubmit}>
                {isRegister ? t.registerBtn : t.loginBtn}
            </Button>
            
            <div className="text-center">
                <button 
                    onClick={() => { setIsRegister(!isRegister); setEmpId(''); setName(''); setDept(''); setPhone(''); }}
                    className="text-sm text-blue-600 font-medium hover:underline flex items-center justify-center gap-1 w-full"
                >
                    {isRegister ? (
                        <>{t.haveAccount}</>
                    ) : (
                        <>{t.noAccount}</>
                    )}
                </button>
            </div>
        </div>
        {!isRegister && <p className="mt-8 text-xs text-center text-gray-300">Admin: 9999 | Driver: 8888</p>}
      </div>
    </div>
  );
};

// Driver Dashboard
const DriverDashboard = ({ user, lang }: any) => {
    const t = TRANSLATIONS[lang as Language];
    const [selectedRouteId, setSelectedRouteId] = useState<string | null>(null);
    const [routes, setRoutes] = useState<RouteOption[]>([]);
    const [bookings, setBookings] = useState<Booking[]>([]);
    const [scanMode, setScanMode] = useState(false);
    const [lastScanned, setLastScanned] = useState<string | null>(null);

    const loadData = async () => {
        const [routesData, bookingsData] = await Promise.all([
            getRoutes(),
            getBookings()
        ]);
        setRoutes(routesData);
        setBookings(bookingsData);
    };

    useEffect(() => {
        loadData();
    }, []);

    const isToday = (ts: number) => {
        const d = new Date(ts);
        const now = new Date();
        return d.getDate() === now.getDate() && d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    };

    const currentBookings = useMemo(() => {
        if (!selectedRouteId) return [];
        return bookings.filter(b => b.routeId === selectedRouteId && isToday(b.timestamp) && b.status !== BookingStatus.CANCELLED);
    }, [bookings, selectedRouteId]);

    const activeRoute = routes.find(r => r.id === selectedRouteId);

    const updateRouteInfo = (field: keyof RouteOption, val: string) => {
        if (!selectedRouteId) return;
        const newRoutes = routes.map(r => r.id === selectedRouteId ? { ...r, [field]: val } : r);
        setRoutes(newRoutes);
        saveRoutes(newRoutes);
    };

    const handleAction = async (bookingId: string, status: BookingStatus) => {
        await updateBookingStatus(bookingId, status);
        await loadData(); // Refresh

        // Show minimal feedback
        const Toast = Swal.mixin({ toast: true, position: 'top-end', showConfirmButton: false, timer: 1500 });
        if(status === BookingStatus.COMPLETED) Toast.fire({ icon: 'success', title: 'Checked In' });
        if(status === BookingStatus.NOSHOW) Toast.fire({ icon: 'warning', title: 'Marked No Show' });
    };

    const handleScan = (data: string) => {
        if (data === lastScanned) return;
        setLastScanned(data);
        setTimeout(() => setLastScanned(null), 3000);

        const booking = currentBookings.find(b => b.id === data);
        if (booking) {
            if (booking.status === BookingStatus.WAITING) {
                handleAction(booking.id, BookingStatus.COMPLETED);
                Swal.fire({
                    icon: 'success',
                    title: 'Welcome!',
                    text: `${booking.userName}`,
                    timer: 1500,
                    showConfirmButton: false
                });
            } else {
                 Swal.fire({ icon: 'info', text: `Status is already ${booking.status}` });
            }
        } else {
            Swal.fire({ icon: 'error', text: 'Passenger not found for this route today' });
        }
    };

    // Group bookings by station
    const groupedBookings = useMemo(() => {
        const groups: {[key: string]: Booking[]} = {};
        currentBookings.forEach(b => {
            if (!groups[b.stationName]) groups[b.stationName] = [];
            groups[b.stationName].push(b);
        });
        return groups;
    }, [currentBookings]);

    // Count bookings per route for today
    const getRouteBookingCount = (routeId: string) => {
        return bookings.filter(b =>
            b.routeId === routeId &&
            isToday(b.timestamp) &&
            b.status !== BookingStatus.CANCELLED
        ).length;
    };

    if (!selectedRouteId) {
        return (
            <div className="p-4 pb-24">
                <h2 className="text-xl font-bold mb-4 text-gray-800">Select Your Route Today</h2>
                <div className="space-y-3">
                    {routes.map(route => {
                        const bookingCount = getRouteBookingCount(route.id);
                        return (
                            <div
                                key={route.id}
                                onClick={() => setSelectedRouteId(route.id)}
                                className="bg-white p-4 rounded-xl shadow-sm border border-gray-200 active:scale-95 transition cursor-pointer"
                            >
                                <div className="flex justify-between items-start">
                                    <div className="flex-1">
                                        <div className="font-bold text-gray-800">{route.name}</div>
                                        <div className="text-sm text-gray-500">{route.time} • {route.type}</div>
                                        {route.licensePlate && (
                                            <div className="mt-2 inline-flex items-center gap-1 bg-gray-100 px-2 py-1 rounded text-xs font-mono font-bold text-gray-600">
                                                <Bus size={12} />
                                                {route.licensePlate}
                                            </div>
                                        )}
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <div className="text-right">
                                            <div className={`text-2xl font-bold ${bookingCount > 0 ? 'text-teal-600' : 'text-gray-300'}`}>
                                                {bookingCount}
                                            </div>
                                            <div className="text-xs text-gray-400">คน</div>
                                        </div>
                                        <ChevronRight className="text-gray-400" />
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        );
    }

    return (
        <div className="p-4 pb-24 h-full flex flex-col">
            {/* Header / Vehicle Config */}
            <div className="bg-teal-700 text-white p-4 rounded-2xl shadow-lg mb-4">
                <div className="flex justify-between items-start mb-4">
                    <div>
                        <h2 className="font-bold text-lg">{activeRoute?.name}</h2>
                        <p className="text-teal-100 text-sm">{activeRoute?.time}</p>
                    </div>
                    <button onClick={() => setSelectedRouteId(null)} className="text-xs bg-white/20 px-2 py-1 rounded">Change</button>
                </div>
                
                <div className="bg-white/10 p-3 rounded-xl border border-white/20">
                    <label className="text-xs text-teal-100 block mb-1">Vehicle License Plate</label>
                    <input 
                        className="w-full bg-transparent border-b border-white/30 text-white font-mono font-bold focus:outline-none focus:border-white"
                        value={activeRoute?.licensePlate || ''}
                        onChange={(e) => updateRouteInfo('licensePlate', e.target.value)}
                        placeholder="Enter Plate No."
                    />
                </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-3 gap-2 mb-4">
                <div className="bg-white p-3 rounded-xl text-center shadow-sm">
                    <div className="text-xs text-gray-500">Total</div>
                    <div className="font-bold text-xl text-gray-800">{currentBookings.length}</div>
                </div>
                <div className="bg-white p-3 rounded-xl text-center shadow-sm border-b-2 border-green-500">
                    <div className="text-xs text-gray-500">Boarded</div>
                    <div className="font-bold text-xl text-green-600">{currentBookings.filter(b=>b.status===BookingStatus.COMPLETED).length}</div>
                </div>
                <div className="bg-white p-3 rounded-xl text-center shadow-sm border-b-2 border-yellow-500">
                    <div className="text-xs text-gray-500">Waiting</div>
                    <div className="font-bold text-xl text-yellow-600">{currentBookings.filter(b=>b.status===BookingStatus.WAITING).length}</div>
                </div>
            </div>

            {/* Scanner Toggle */}
            <Button 
                fullWidth 
                variant={scanMode ? 'primary' : 'outline'} 
                onClick={() => setScanMode(!scanMode)} 
                className={`mb-4 ${scanMode ? 'bg-teal-600 border-teal-600' : 'text-teal-600 border-teal-600'}`}
            >
                <QrCode size={18} /> {scanMode ? 'Close Scanner' : 'Scan Passenger QR'}
            </Button>

            {scanMode && <QRScanner onScan={handleScan} onClose={() => setScanMode(false)} />}

            {/* Passenger List */}
            <div className="flex-1 overflow-y-auto space-y-4 no-scrollbar">
                {Object.keys(groupedBookings).length === 0 ? (
                    <div className="text-center text-gray-400 mt-10">No bookings for this route today.</div>
                ) : (
                    Object.keys(groupedBookings).map(station => (
                        <div key={station} className="bg-white rounded-xl shadow-sm overflow-hidden border border-gray-100">
                            <div className="bg-gray-50 px-4 py-2 font-bold text-gray-700 text-sm flex items-center gap-2">
                                <MapIcon size={14} /> {station} 
                                <span className="bg-gray-200 text-gray-600 text-[10px] px-2 py-0.5 rounded-full ml-auto">{groupedBookings[station].length}</span>
                            </div>
                            <div className="divide-y divide-gray-50">
                                {groupedBookings[station].map(booking => (
                                    <div key={booking.id} className="p-3 flex justify-between items-center">
                                        <div className={booking.status === BookingStatus.COMPLETED ? 'opacity-50' : ''}>
                                            <div className="font-bold text-gray-800 text-sm">{booking.userName}</div>
                                            <div className="text-xs text-gray-400 font-mono">#{booking.id.slice(0,6)}</div>
                                        </div>
                                        
                                        {booking.status === BookingStatus.WAITING ? (
                                            <div className="flex gap-2">
                                                <button onClick={() => handleAction(booking.id, BookingStatus.NOSHOW)} className="p-2 bg-red-50 text-red-500 rounded-lg hover:bg-red-100">
                                                    <UserX size={18} />
                                                </button>
                                                <button onClick={() => handleAction(booking.id, BookingStatus.COMPLETED)} className="p-2 bg-green-50 text-green-500 rounded-lg hover:bg-green-100">
                                                    <Check size={18} strokeWidth={3} />
                                                </button>
                                            </div>
                                        ) : (
                                            <span className={`text-[10px] font-bold px-2 py-1 rounded uppercase ${
                                                booking.status === BookingStatus.COMPLETED ? 'bg-green-100 text-green-700' : 
                                                booking.status === BookingStatus.NOSHOW ? 'bg-red-100 text-red-700' : 'bg-gray-100 text-gray-500'
                                            }`}>
                                                {booking.status}
                                            </span>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
};

// Home Page
const Home = ({ user, lang, setView, toggleLang }: any) => {
  const t = TRANSLATIONS[lang as Language];
  const navigate = useNavigate();
  const [activeBookings, setActiveBookings] = useState<Booking[]>([]);
  const [bookingToCancel, setBookingToCancel] = useState<string | null>(null);
  const [news, setNews] = useState<string>('');

  const loadBookings = async () => {
    const bookings = await getUserBookings(user.id);
    setActiveBookings(bookings.filter(b => b.status === BookingStatus.WAITING || b.status === BookingStatus.BOOKED));
  };

  const loadNews = async () => {
    const newsContent = await getNews();
    setNews(newsContent);
  };

  useEffect(() => {
    loadBookings();
    loadNews();
  }, [user.id]);

  const todayBookings = useMemo(() => {
    const now = new Date();
    return activeBookings.filter(b => {
        const bDate = new Date(b.timestamp);
        return bDate.getDate() === now.getDate() && 
               bDate.getMonth() === now.getMonth() && 
               bDate.getFullYear() === now.getFullYear();
    });
  }, [activeBookings]);

  const onConfirmCancel = async () => {
    if (bookingToCancel) {
      await updateBookingStatus(bookingToCancel, BookingStatus.CANCELLED);
      loadBookings();
      setBookingToCancel(null);
    }
  };

  return (
    <div className="p-4 pb-24 space-y-6">
      <ConfirmationModal 
        isOpen={!!bookingToCancel} 
        onClose={() => setBookingToCancel(null)}
        onConfirm={onConfirmCancel}
        title={t.cancel}
        message={t.confirmCancel}
      />

      {/* Header */}
      <div className="flex justify-between items-center bg-blue-600 text-white p-6 -mx-4 -mt-4 rounded-b-3xl shadow-lg">
        <div>
          <h2 className="text-xl font-bold">{t.hello}, {user.name.split(' ')[0]}</h2>
          <p className="text-blue-100 text-sm">{user.department}</p>
        </div>
        <div className="flex items-center gap-3">
            <button onClick={toggleLang} className="bg-white/20 hover:bg-white/30 px-3 py-1.5 rounded-full text-xs font-bold backdrop-blur-sm transition-all border border-white/10 flex items-center gap-1">
                <Globe size={12} /> {lang.toUpperCase()}
            </button>
            <div className="bg-white/20 p-2 rounded-full cursor-pointer hover:bg-white/30 transition-all" onClick={() => navigate('/profile')}>
                <UserIcon size={24} />
            </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-3 gap-3">
        <div onClick={() => navigate('/book')} className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 flex flex-col items-center gap-3 active:bg-gray-50 transition cursor-pointer">
          <div className="bg-green-100 p-3 rounded-full">
            <PlusCircle className="w-6 h-6 text-green-600" />
          </div>
          <span className="font-semibold text-gray-700 text-xs">{t.bookShuttle}</span>
        </div>
        <div onClick={() => navigate('/map')} className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 flex flex-col items-center gap-3 active:bg-gray-50 transition cursor-pointer">
          <div className="bg-orange-100 p-3 rounded-full">
            <MapIcon className="w-6 h-6 text-orange-600" />
          </div>
          <span className="font-semibold text-gray-700 text-xs">{t.mapGps}</span>
        </div>
        <div onClick={() => navigate('/history')} className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 flex flex-col items-center gap-3 active:bg-gray-50 transition cursor-pointer">
          <div className="bg-purple-100 p-3 rounded-full">
            <History className="w-6 h-6 text-purple-600" />
          </div>
          <span className="font-semibold text-gray-700 text-xs">{t.history || 'History'}</span>
        </div>
      </div>

      {/* Active Booking Card(s) - FILTERED FOR TODAY */}
      <div className="bg-white rounded-2xl shadow-md overflow-hidden border border-gray-100">
        <div className="bg-gray-50 px-4 py-3 border-b border-gray-100 flex justify-between items-center">
          <h3 className="font-semibold text-gray-700">{todayBookings.length > 0 ? t.todaysTrips : t.currentStatus}</h3>
          {activeBookings.length > 0 ? (
            <span className={`${todayBookings.length > 0 ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'} px-2 py-0.5 rounded-md text-xs font-bold uppercase`}>
                {todayBookings.length} Today / {activeBookings.length} Total
            </span>
          ) : (
            <span className="text-gray-400 text-xs">{t.available}</span>
          )}
        </div>
        <div className="p-4">
          {todayBookings.length > 0 ? (
            <div className="space-y-6">
              {todayBookings.map((booking, index) => {
                const routeDetails = getRouteById(booking.routeId);
                const bookingDate = new Date(booking.timestamp);
                
                return (
                  <div key={booking.id} className={`${index > 0 ? 'pt-4 border-t border-gray-100' : ''}`}>
                      <div className="space-y-3">
                          <div>
                              <div className="flex justify-between items-center">
                                  <div className="flex items-center gap-2">
                                     <div className="text-xs text-gray-500 uppercase tracking-wide">Route</div>
                                     <div className="text-[10px] bg-blue-100 text-blue-700 px-2 py-0.5 rounded font-bold">
                                         TODAY
                                     </div>
                                  </div>
                                  {booking.shift && (
                                    <span className="text-[10px] bg-blue-50 text-blue-600 px-2 py-0.5 rounded-full font-bold uppercase">
                                        {booking.shift} {booking.direction && `• ${booking.direction}`}
                                    </span>
                                  )}
                              </div>
                              <div className="font-medium text-lg text-gray-800">{booking.routeName}</div>
                              {routeDetails?.licensePlate && (
                                <div className="flex items-center gap-2 mt-1">
                                    <div className="bg-gray-100 px-2 py-0.5 rounded text-xs font-mono font-bold text-gray-700 border border-gray-300">
                                      {routeDetails.licensePlate}
                                    </div>
                                    {routeDetails.driverPhone && (
                                      <a href={`tel:${routeDetails.driverPhone}`} className="text-blue-600 text-xs flex items-center gap-1 font-bold">
                                        <Phone size={12} /> Call Driver
                                      </a>
                                    )}
                                </div>
                              )}
                          </div>
                          <div className="flex justify-between">
                              <div>
                                  <div className="text-xs text-gray-500 uppercase tracking-wide">Station</div>
                                  <div className="font-medium text-gray-800">{booking.stationName}</div>
                              </div>
                              <div className="text-right">
                                  <div className="text-xs text-gray-500 uppercase tracking-wide">Code</div>
                                  <div className="font-mono text-blue-600 font-bold">{booking.id.slice(0,6)}</div>
                              </div>
                          </div>
                          <div className="grid grid-cols-2 gap-3 mt-2">
                              <Button variant="outline" onClick={() => navigate('/qr', { state: { bookingId: booking.id } })}>
                                  <QrCode className="w-4 h-4" /> {t.myQr}
                              </Button>
                              <Button variant="danger" onClick={() => setBookingToCancel(booking.id)}>
                                  {t.cancel}
                              </Button>
                          </div>
                      </div>
                  </div>
                );
              })}
            </div>
          ) : (
             <div className="flex flex-col items-center py-6 text-gray-400">
               {activeBookings.length > 0 ? (
                   <div className="text-center animate-in fade-in duration-300">
                       <Calendar className="w-12 h-12 mb-2 opacity-20 mx-auto text-blue-500" />
                       <p className="font-bold text-gray-600">{t.noTripsToday}</p>
                       <p className="text-xs mt-1 text-gray-400">You have <span className="font-bold text-blue-600">{activeBookings.length}</span> {t.upcomingTrips.toLowerCase()}.</p>
                       <Button variant="outline" className="mt-4" onClick={() => navigate('/history')}>
                            {t.viewAll}
                       </Button>
                   </div>
               ) : (
                   <div className="text-center">
                       <Bus className="w-12 h-12 mb-2 opacity-20 mx-auto" />
                       <p>{t.noBookings}</p>
                   </div>
               )}
             </div>
          )}
        </div>
      </div>
      
      {/* News Section */}
      <div className="bg-gradient-to-r from-indigo-500 to-purple-600 rounded-2xl p-4 text-white shadow-lg">
        <div className="flex items-center gap-2 mb-2">
            <AlertTriangle size={18} className="text-yellow-300"/>
            <h3 className="font-bold">{t.news}</h3>
        </div>
        <p className="text-sm opacity-90 whitespace-pre-line">
          {news}
        </p>
      </div>
    </div>
  );
};

// Booking History Page
const BookingHistory = ({ user, lang }: any) => {
    const t = TRANSLATIONS[lang as Language];
    const navigate = useNavigate();
    const [bookings, setBookings] = useState<Booking[]>([]);
    const [bookingToCancel, setBookingToCancel] = useState<string | null>(null);

    const loadBookings = async () => {
        const data = await getUserBookings(user.id);
        setBookings(data);
    };

    useEffect(() => {
        loadBookings();
    }, [user.id]);

    const onConfirmCancel = async () => {
        if (bookingToCancel) {
            await updateBookingStatus(bookingToCancel, BookingStatus.CANCELLED);
            loadBookings();
            setBookingToCancel(null);
        }
    };

    return (
        <div className="p-4 pb-24 h-full flex flex-col">
            <ConfirmationModal 
                isOpen={!!bookingToCancel} 
                onClose={() => setBookingToCancel(null)}
                onConfirm={onConfirmCancel}
                title={t.cancel}
                message={t.confirmCancel}
            />

             <div className="flex items-center gap-3 mb-6 bg-white p-2 pr-6 rounded-full shadow-sm w-fit">
                <button 
                    onClick={() => navigate(-1)} 
                    className="p-2 bg-gray-100 rounded-full text-gray-700 hover:bg-gray-200 transition-colors"
                >
                    <ArrowLeft size={20} />
                </button>
                <h2 className="font-bold text-gray-900 text-lg">{t.history}</h2>
            </div>
            
            <div className="flex-1 overflow-y-auto no-scrollbar pb-10 space-y-4">
                {bookings.length === 0 ? (
                    <div className="text-center text-gray-400 mt-20 flex flex-col items-center">
                        <History size={64} className="mb-4 opacity-20" />
                        <p>No booking history found.</p>
                        <Button variant="outline" className="mt-6" onClick={() => navigate('/book')}>
                            Book Now
                        </Button>
                    </div>
                ) : (
                    bookings.map(booking => (
                        <div key={booking.id} className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 relative overflow-hidden">
                            <div className={`absolute top-0 right-0 w-2 h-full ${
                                booking.status === BookingStatus.COMPLETED ? 'bg-green-500' :
                                booking.status === BookingStatus.CANCELLED ? 'bg-red-500' :
                                'bg-yellow-500'
                            }`} />
                            <div className="flex justify-between items-start mb-2 pr-4">
                                <div>
                                    <h3 className="font-bold text-gray-800 text-lg">{booking.routeName}</h3>
                                    <div className="flex items-center gap-1 text-gray-500 text-sm mt-1">
                                        <MapIcon size={14} />
                                        <span>{booking.stationName}</span>
                                    </div>
                                    <div className="text-xs text-gray-400 mt-0.5">
                                        {new Date(booking.timestamp).toLocaleDateString(undefined, {weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'})}
                                    </div>
                                    {booking.shift && (
                                        <div className="mt-1">
                                            <span className="text-[10px] bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full font-bold uppercase">
                                                {booking.shift} {booking.direction && `• ${booking.direction}`}
                                            </span>
                                        </div>
                                    )}
                                </div>
                                <div className="flex flex-col items-end gap-1">
                                    <span className={`text-[10px] font-bold px-2 py-1 rounded uppercase tracking-wider ${
                                        booking.status === BookingStatus.COMPLETED ? 'bg-green-100 text-green-700' :
                                        booking.status === BookingStatus.CANCELLED ? 'bg-red-100 text-red-700' :
                                        'bg-yellow-100 text-yellow-700'
                                    }`}>
                                        {booking.status}
                                    </span>
                                    {(booking.status === BookingStatus.WAITING || booking.status === BookingStatus.BOOKED) && (
                                        <button 
                                            onClick={(e) => { e.stopPropagation(); setBookingToCancel(booking.id); }}
                                            className="text-xs text-red-500 underline font-medium hover:text-red-700"
                                        >
                                            {t.cancel}
                                        </button>
                                    )}
                                </div>
                            </div>
                            <div className="flex justify-between items-center text-xs text-gray-400 border-t border-gray-50 pt-3 mt-2">
                                <span className="flex items-center gap-1">
                                    <Clock size={12} />
                                    {new Date(booking.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                                </span>
                                <span className="font-mono">#{booking.id.slice(0,6)}</span>
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
};

// Admin Dashboard
const AdminDashboard = ({ lang, toggleLang }: any) => {
    const t = TRANSLATIONS[lang as Language];
    const [bookings, setBookings] = useState<Booking[]>([]);
    const [scanMode, setScanMode] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [routes, setRoutes] = useState<RouteOption[]>([]);
    const [isManageVehicles, setIsManageVehicles] = useState(false);
    const [currentDate, setCurrentDate] = useState(new Date());
    const [lastScanned, setLastScanned] = useState<string | null>(null);
    const [newsContent, setNewsContent] = useState('');

    // Load bookings, news and routes from Supabase
    const loadData = async () => {
        const [bookingsData, newsData, routesData] = await Promise.all([
            getBookings(),
            getNews(),
            getRoutes()
        ]);
        setBookings(bookingsData);
        setNewsContent(newsData);
        setRoutes(routesData);
    };

    useEffect(() => {
        loadData();
    }, []);

    // Refresh routes when exiting manage vehicles
    const loadRoutes = async () => {
        const routesData = await getRoutes();
        setRoutes(routesData);
    };

    useEffect(() => {
        if (!isManageVehicles) {
            loadRoutes();
        }
    }, [isManageVehicles]);

    const navigateDate = (days: number) => {
        const next = new Date(currentDate);
        next.setDate(currentDate.getDate() + days);
        setCurrentDate(next);
    };

    const isToday = (date: Date) => {
        const today = new Date();
        return date.getDate() === today.getDate() &&
               date.getMonth() === today.getMonth() &&
               date.getFullYear() === today.getFullYear();
    };

    // Filter Bookings by Date
    const dateFilteredBookings = useMemo(() => {
        return bookings.filter(b => {
             const bDate = new Date(b.timestamp);
             return bDate.getDate() === currentDate.getDate() &&
                    bDate.getMonth() === currentDate.getMonth() &&
                    bDate.getFullYear() === currentDate.getFullYear();
        });
    }, [bookings, currentDate]);

    const stats = useMemo(() => {
        const routeCounts = routes.map(r => ({
            name: r.name.split(' ')[0],
            count: dateFilteredBookings.filter(b => b.routeId === r.id && b.status !== BookingStatus.CANCELLED).length
        }));
        return routeCounts.filter(r => r.count > 0);
    }, [dateFilteredBookings, routes]);

    const handleScan = async (data: string) => {
        if (data === lastScanned) return;
        setLastScanned(data);
        setTimeout(() => setLastScanned(null), 3000); // Prevent duplicate scans for 3s

        const booking = bookings.find(b => b.id === data);
        if (booking) {
            if (booking.status === BookingStatus.WAITING || booking.status === BookingStatus.BOOKED) {
                await updateBookingStatus(booking.id, BookingStatus.COMPLETED);
                loadData();
                Swal.fire({
                    icon: 'success',
                    title: 'Check-in Successful',
                    html: `<div class="text-left">
                            <p><strong>Passenger:</strong> ${booking.userName}</p>
                            <p><strong>Route:</strong> ${booking.routeName}</p>
                           </div>`,
                    timer: 2500,
                    showConfirmButton: false
                });
            } else {
                 Swal.fire({
                    icon: 'info',
                    text: `Booking ${booking.id.slice(0,6)} is already ${booking.status}`
                });
            }
        } else {
            console.log("Unknown QR code");
        }
    };

    const handleSaveRoutes = async () => {
        await saveRoutes(routes);
        Swal.fire({ icon: 'success', text: 'Route details updated successfully', timer: 1500, showConfirmButton: false });
        setIsManageVehicles(false);
    };

    const handleRouteUpdate = (id: string, field: keyof RouteOption, value: string) => {
        setRoutes(prev => prev.map(r => r.id === id ? { ...r, [field]: value } : r));
    };

    const handleSaveNews = async () => {
        await saveNews(newsContent);
        Swal.fire({ icon: 'success', text: 'News updated successfully', timer: 1500, showConfirmButton: false });
    };

    const exportData = () => {
        const headers = ["ID", "ชื่อผู้โดยสาร", "สาย", "จุดจอด", "สถานะ", "เวลา"];
        const rows = dateFilteredBookings.map(b => [
            b.id,
            b.userName,
            b.routeName,
            b.stationName,
            b.status === BookingStatus.COMPLETED ? 'ขึ้นรถแล้ว' :
            b.status === BookingStatus.CANCELLED ? 'ยกเลิก' :
            b.status === BookingStatus.NOSHOW ? 'ไม่มา' : 'รอขึ้นรถ',
            new Date(b.timestamp).toLocaleString('th-TH')
        ]);

        // Add BOM for UTF-8 to support Thai characters in Excel
        const BOM = "\uFEFF";
        const csvContent = BOM + headers.join(",") + "\n" + rows.map(e => e.join(",")).join("\n");

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.setAttribute("href", url);

        // Add date to filename
        const dateStr = currentDate.toLocaleDateString('th-TH', { day: '2-digit', month: '2-digit', year: 'numeric' }).replace(/\//g, '-');
        link.setAttribute("download", `shuttle_data_${dateStr}.csv`);

        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    };

    const filteredBookings = dateFilteredBookings.filter(b =>
        b.userName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        b.id.includes(searchTerm)
    );

    // Group bookings by time period
    const groupedByPeriod = useMemo(() => {
        const groups: { morning: Booking[], evening: Booking[], night: Booking[] } = {
            morning: [],
            evening: [],
            night: []
        };

        filteredBookings.forEach(b => {
            // Check route type from routes data
            const route = routes.find(r => r.id === b.routeId);
            if (route) {
                if (route.type === 'morning') {
                    groups.morning.push(b);
                } else if (route.type === 'evening') {
                    groups.evening.push(b);
                } else if (route.type === 'night') {
                    groups.night.push(b);
                }
            }
        });

        return groups;
    }, [filteredBookings, routes]);
    
    if (isManageVehicles) {
        return (
            <div className="p-4 pb-24 h-full flex flex-col">
                <div className="flex items-center gap-3 mb-6 bg-white p-2 pr-6 rounded-full shadow-sm w-fit">
                    <button onClick={() => setIsManageVehicles(false)} className="p-2 bg-gray-100 rounded-full text-gray-700 hover:bg-gray-200 transition-colors">
                        <ArrowLeft size={20} />
                    </button>
                    <h2 className="font-bold text-gray-900 text-lg">Manage Vehicles</h2>
                </div>
                
                <div className="flex-1 overflow-y-auto no-scrollbar space-y-4 pb-4">
                    {routes.map(route => (
                        <div key={route.id} className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
                             <div className="flex justify-between items-start mb-3">
                                <h3 className="font-bold text-gray-800">{route.name}</h3>
                                <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded font-mono">{route.time}</span>
                             </div>
                             <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-xs text-gray-500 mb-1">License Plate</label>
                                    <input 
                                        className="w-full border rounded p-2 text-sm bg-gray-50 text-gray-900 placeholder-gray-400 border-gray-300 focus:border-blue-500 outline-none"
                                        value={route.licensePlate || ''}
                                        onChange={(e) => handleRouteUpdate(route.id, 'licensePlate', e.target.value)}
                                        placeholder="e.g. 1AB-1234"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs text-gray-500 mb-1">Driver Phone</label>
                                    <input 
                                        className="w-full border rounded p-2 text-sm bg-gray-50 text-gray-900 placeholder-gray-400 border-gray-300 focus:border-blue-500 outline-none"
                                        value={route.driverPhone || ''}
                                        onChange={(e) => handleRouteUpdate(route.id, 'driverPhone', e.target.value)}
                                        placeholder="08X-XXX-XXXX"
                                    />
                                </div>
                             </div>
                        </div>
                    ))}
                </div>
                <div className="pt-4">
                    <Button fullWidth onClick={handleSaveRoutes}>Save All Changes</Button>
                </div>
            </div>
        );
    }

    return (
        <div className="p-4 pb-24">
            <div className="flex justify-between items-center mb-6">
                 <h2 className="text-2xl font-bold text-gray-800">{t.adminDashboard}</h2>
            </div>
            
            {/* News Management */}
            <div className="bg-white p-4 rounded-xl shadow-sm mb-6">
                <div className="flex items-center gap-2 mb-3 text-purple-600 font-bold">
                    <Megaphone size={18} />
                    <h3>{t.news} Management</h3>
                </div>
                <textarea 
                    className="w-full p-3 rounded-xl border border-gray-200 bg-gray-50 text-gray-900 text-sm focus:outline-none focus:ring-2 focus:ring-purple-200 min-h-[80px]"
                    placeholder="Enter news or announcement here..."
                    value={newsContent}
                    onChange={(e) => setNewsContent(e.target.value)}
                />
                <Button 
                    fullWidth 
                    className="mt-3 bg-purple-600 shadow-purple-200 hover:bg-purple-700" 
                    onClick={handleSaveNews}
                >
                    Update News
                </Button>
            </div>

            {/* Date Navigator */}
            <div className="flex items-center justify-between bg-white p-3 rounded-xl shadow-sm mb-4">
                <button onClick={() => navigateDate(-1)} className="p-2 hover:bg-gray-100 rounded-full transition-colors"><ChevronLeft size={20} className="text-gray-600" /></button>
                <div className="flex flex-col items-center">
                    <span className="font-bold text-gray-800 flex items-center gap-2">
                        <Calendar size={16} className="text-blue-600"/>
                        {currentDate.toLocaleDateString(lang === Language.TH ? 'th-TH' : 'en-US', { day: 'numeric', month: 'long', year: 'numeric' })}
                    </span>
                    {isToday(currentDate) && <span className="text-[10px] bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-bold mt-1">TODAY</span>}
                </div>
                <button onClick={() => navigateDate(1)} className="p-2 hover:bg-gray-100 rounded-full transition-colors"><ChevronRight size={20} className="text-gray-600" /></button>
            </div>
            
            {/* Stats */}
            <div className="bg-white p-4 rounded-xl shadow-sm mb-6 h-64">
                <h3 className="font-bold mb-4 text-sm text-gray-500 uppercase flex items-center gap-2">
                    {t.totalBookings}
                    {isToday(currentDate) ? <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">Today</span> : <span className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">History</span>}
                </h3>
                {stats.length > 0 ? (
                    <ResponsiveContainer width="100%" height="80%">
                        <BarChart data={stats}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} />
                            <XAxis dataKey="name" tick={{fontSize: 10}} />
                            <YAxis allowDecimals={false} />
                            <Tooltip />
                            <Bar dataKey="count" fill="#4f46e5" radius={[4, 4, 0, 0]} />
                        </BarChart>
                    </ResponsiveContainer>
                ) : (
                    <div className="h-full flex flex-col items-center justify-center text-gray-400">
                        <BarChartIcon size={32} className="opacity-20 mb-2" />
                        <span className="text-xs">No data for selected date</span>
                    </div>
                )}
            </div>

            {/* Actions */}
            <div className="grid grid-cols-2 gap-4 mb-6">
                <Button onClick={() => setScanMode(!scanMode)} variant={scanMode ? 'primary' : 'outline'}>
                    <QrCode size={18} /> {scanMode ? 'Close Cam' : 'Scan QR'}
                </Button>
                <Button onClick={exportData} variant="secondary">
                    <Settings size={18} /> {t.export}
                </Button>
                <Button onClick={() => setIsManageVehicles(true)} className="col-span-2 bg-indigo-600 hover:bg-indigo-700 text-white shadow-indigo-200">
                    <Truck size={18} /> Manage Vehicle & Driver
                </Button>
            </div>

            {/* Camera View */}
            {scanMode && (
                <QRScanner onScan={handleScan} onClose={() => setScanMode(false)} />
            )}

            {/* Passenger List */}
            <div className="bg-white rounded-xl shadow-sm overflow-hidden">
                <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-gray-50">
                     <h3 className="font-bold">{t.passengerList}</h3>
                     <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded-full">{filteredBookings.length} Total</span>
                </div>
                <div className="p-4 border-b border-gray-100">
                     <div className="flex items-center bg-gray-100 px-3 rounded-lg">
                        <Search size={16} className="text-gray-400" />
                        <input
                            className="bg-transparent border-none p-2 text-sm outline-none w-full"
                            placeholder="Search name or ID..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                     </div>
                </div>
                <div className="max-h-[500px] overflow-y-auto">
                    {filteredBookings.length === 0 ? (
                        <div className="p-8 text-center text-gray-400">No data found for this date.</div>
                    ) : (
                        <>
                            {/* Morning Section */}
                            {groupedByPeriod.morning.length > 0 && (
                                <div>
                                    <div className="sticky top-0 bg-blue-600 text-white px-4 py-2 flex justify-between items-center">
                                        <div className="flex items-center gap-2">
                                            <Sun size={16} />
                                            <span className="font-bold text-sm">ช่วงเช้า (Morning)</span>
                                        </div>
                                        <span className="text-xs bg-white/20 px-2 py-0.5 rounded-full">{groupedByPeriod.morning.length} คน</span>
                                    </div>
                                    {groupedByPeriod.morning.map(b => (
                                        <div key={b.id} className="p-4 border-b border-gray-50 hover:bg-blue-50">
                                            <div className="flex justify-between mb-1">
                                                <span className="font-bold text-gray-800">{b.userName}</span>
                                                <span className={`text-xs font-bold px-2 py-1 rounded ${
                                                    b.status === BookingStatus.COMPLETED ? 'bg-green-100 text-green-700' :
                                                    b.status === BookingStatus.CANCELLED ? 'bg-red-100 text-red-700' : 'bg-yellow-100 text-yellow-700'
                                                }`}>
                                                    {b.status}
                                                </span>
                                            </div>
                                            <div className="text-xs text-gray-500">{b.routeName} • {b.stationName}</div>
                                        </div>
                                    ))}
                                </div>
                            )}

                            {/* Evening Section */}
                            {groupedByPeriod.evening.length > 0 && (
                                <div>
                                    <div className="sticky top-0 bg-orange-500 text-white px-4 py-2 flex justify-between items-center">
                                        <div className="flex items-center gap-2">
                                            <Sunset size={16} />
                                            <span className="font-bold text-sm">ช่วงเย็น (Evening)</span>
                                        </div>
                                        <span className="text-xs bg-white/20 px-2 py-0.5 rounded-full">{groupedByPeriod.evening.length} คน</span>
                                    </div>
                                    {groupedByPeriod.evening.map(b => (
                                        <div key={b.id} className="p-4 border-b border-gray-50 hover:bg-orange-50">
                                            <div className="flex justify-between mb-1">
                                                <span className="font-bold text-gray-800">{b.userName}</span>
                                                <span className={`text-xs font-bold px-2 py-1 rounded ${
                                                    b.status === BookingStatus.COMPLETED ? 'bg-green-100 text-green-700' :
                                                    b.status === BookingStatus.CANCELLED ? 'bg-red-100 text-red-700' : 'bg-yellow-100 text-yellow-700'
                                                }`}>
                                                    {b.status}
                                                </span>
                                            </div>
                                            <div className="text-xs text-gray-500">{b.routeName} • {b.stationName}</div>
                                        </div>
                                    ))}
                                </div>
                            )}

                            {/* Night Section */}
                            {groupedByPeriod.night.length > 0 && (
                                <div>
                                    <div className="sticky top-0 bg-indigo-700 text-white px-4 py-2 flex justify-between items-center">
                                        <div className="flex items-center gap-2">
                                            <Moon size={16} />
                                            <span className="font-bold text-sm">ช่วงดึก (Night)</span>
                                        </div>
                                        <span className="text-xs bg-white/20 px-2 py-0.5 rounded-full">{groupedByPeriod.night.length} คน</span>
                                    </div>
                                    {groupedByPeriod.night.map(b => (
                                        <div key={b.id} className="p-4 border-b border-gray-50 hover:bg-indigo-50">
                                            <div className="flex justify-between mb-1">
                                                <span className="font-bold text-gray-800">{b.userName}</span>
                                                <span className={`text-xs font-bold px-2 py-1 rounded ${
                                                    b.status === BookingStatus.COMPLETED ? 'bg-green-100 text-green-700' :
                                                    b.status === BookingStatus.CANCELLED ? 'bg-red-100 text-red-700' : 'bg-yellow-100 text-yellow-700'
                                                }`}>
                                                    {b.status}
                                                </span>
                                            </div>
                                            <div className="text-xs text-gray-500">{b.routeName} • {b.stationName}</div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </>
                    )}
                </div>
            </div>
        </div>
    );
};

const BookingFlow = ({ user, lang }: any) => {
    const t = TRANSLATIONS[lang as Language];
    const navigate = useNavigate();
    const [step, setStep] = useState(1);
    const [activeTab, setActiveTab] = useState<'morning' | 'evening' | 'night'>('morning');
    const [selectedRoute, setSelectedRoute] = useState<RouteOption | null>(null);
    const [selectedStation, setSelectedStation] = useState<Station | null>(null);
    const [selectedDates, setSelectedDates] = useState<Date[]>([]);
    const [direction, setDirection] = useState<'inbound' | 'outbound'>('outbound');
    const [routes, setRoutes] = useState<RouteOption[]>([]);
    const [seatCounts, setSeatCounts] = useState<Record<string, number>>({});

    useEffect(() => {
        const loadData = async () => {
            const routesData = await getRoutes();
            setRoutes(routesData);

            // Load seat counts for all routes
            const counts: Record<string, number> = {};
            for (const route of routesData) {
                counts[route.id] = await getRouteSeatCount(route.id);
            }
            setSeatCounts(counts);
        };
        loadData();
    }, []);

    // Group routes
    const morningIn = routes.filter(r => r.id.match(/^m\d+$/));
    const eveningOut = routes.filter(r => r.id.match(/^mn\d+$/) || r.id.match(/^mo\d+$/)); // Fixed regex for normal and OT
    const nightIn = routes.filter(r => r.id.match(/^n\d+$/));
    const nightOut = routes.filter(r => r.id.match(/^nn\d+$/) || r.id.match(/^no\d+$/)); // Fixed regex

    const handleRouteSelect = (route: RouteOption, dir: 'inbound' | 'outbound') => {
        setSelectedRoute(route);
        setDirection(dir);
        setStep(2);
    };

    const handleStationSelect = (station: Station) => {
        setSelectedStation(station);
        setStep(3);
    };

    // Date Logic
    const generateNext7Days = () => {
        const dates = [];
        const today = new Date();
        for (let i = 0; i < 7; i++) {
            const nextDay = new Date(today);
            nextDay.setDate(today.getDate() + i);
            nextDay.setHours(0, 0, 0, 0);
            dates.push(nextDay);
        }
        return dates;
    };
    const availableDates = useMemo(() => generateNext7Days(), []);

    const toggleDate = (date: Date) => {
        const isSelected = selectedDates.some(d => d.getTime() === date.getTime());
        if (isSelected) {
            setSelectedDates(prev => prev.filter(d => d.getTime() !== date.getTime()));
        } else {
            setSelectedDates(prev => [...prev, date]);
        }
    };

    const confirmBooking = async () => {
        if (!selectedRoute || !selectedStation || selectedDates.length === 0) return;

        let createdCount = 0;
        let failCount = 0;
        const allUserBookings = await getUserBookings(user.id);

        for (const date of selectedDates) {
            // Construct timestamp for this specific date and route time
            const [hours, mins] = selectedRoute.time.split(':').map(Number);
            const travelDate = new Date(date);
            travelDate.setHours(hours, mins, 0, 0);

            // Smart Duplicate Check
            const isDup = allUserBookings.some(b =>
                Math.abs(b.timestamp - travelDate.getTime()) < 60000 &&
                b.status !== BookingStatus.CANCELLED
            );

            if (!isDup) {
                 const newBooking: Booking = {
                    id: Math.random().toString(36).substr(2, 9).toUpperCase(),
                    userId: user.id,
                    userName: user.name,
                    routeId: selectedRoute.id,
                    routeName: selectedRoute.name,
                    stationId: selectedStation.id,
                    stationName: selectedStation.name,
                    timestamp: travelDate.getTime(),
                    status: BookingStatus.WAITING,
                    direction: direction,
                    shift: activeTab === 'morning' ? 'morning' : (activeTab === 'night' ? 'night' : undefined)
                };
                await saveBooking(newBooking);
                createdCount++;
            } else {
                failCount++;
            }
        }

        Swal.fire({
            icon: createdCount > 0 ? 'success' : 'warning',
            title: createdCount > 0 ? t.success : 'No New Bookings',
            text: createdCount > 0
                  ? `Booked ${createdCount} trips.` + (failCount > 0 ? ` (${failCount} duplicates skipped)` : '')
                  : 'You have already booked trips for all selected dates.',
            timer: 2000,
            showConfirmButton: false
        }).then(() => {
            if(createdCount > 0) navigate('/');
        });
    };

    return (
        <div className="p-4 pb-24 h-full flex flex-col bg-gray-50">
            {/* Header */}
            <div className="flex items-center gap-3 mb-6 bg-white p-2 pr-6 rounded-full shadow-sm w-fit sticky top-0 z-20">
                <button onClick={() => step === 1 ? navigate('/') : setStep(step - 1)} className="p-2 bg-gray-100 rounded-full text-gray-700 hover:bg-gray-200 transition-colors">
                    <ArrowLeft size={20} />
                </button>
                <h2 className="font-bold text-gray-900 text-lg">
                    {step === 1 ? t.selectRoute : step === 2 ? t.selectStation : t.selectDates}
                </h2>
            </div>

            {/* STEP 1: Select Route (Tabs + Lists) */}
            {step === 1 && (
                <>
                    <div className="flex bg-white p-1 rounded-xl shadow-sm mb-6 sticky top-16 z-10">
                        {(['morning', 'evening', 'night'] as const).map(tab => (
                            <button
                                key={tab}
                                onClick={() => setActiveTab(tab)}
                                className={`flex-1 py-2 text-sm font-bold rounded-lg transition-all capitalize ${
                                    activeTab === tab 
                                    ? 'bg-blue-600 text-white shadow-md' 
                                    : 'text-gray-500 hover:bg-gray-50'
                                }`}
                            >
                                {t[tab as keyof typeof t] || tab}
                            </button>
                        ))}
                    </div>

                    <div className="flex-1 overflow-y-auto no-scrollbar space-y-2 pb-20">
                        {activeTab === 'morning' && (
                            <RouteSection
                                title="Morning (Inbound)"
                                routes={morningIn}
                                direction="inbound"
                                onRouteClick={handleRouteSelect}
                                t={t}
                                seatCounts={seatCounts}
                            />
                        )}
                        {activeTab === 'evening' && (
                            <RouteSection
                                title="Evening (Outbound)"
                                routes={eveningOut}
                                direction="outbound"
                                onRouteClick={handleRouteSelect}
                                t={t}
                                seatCounts={seatCounts}
                            />
                        )}
                        {activeTab === 'night' && (
                            <>
                                <RouteSection
                                    title="Night (Inbound)"
                                    routes={nightIn}
                                    direction="inbound"
                                    onRouteClick={handleRouteSelect}
                                    t={t}
                                    seatCounts={seatCounts}
                                />
                                <RouteSection
                                    title="Night (Outbound)"
                                    routes={nightOut}
                                    direction="outbound"
                                    onRouteClick={handleRouteSelect}
                                    t={t}
                                    seatCounts={seatCounts}
                                />
                            </>
                        )}
                    </div>
                </>
            )}

            {/* STEP 2: Select Station */}
            {step === 2 && selectedRoute && (
                <div className="space-y-3 pb-20 animate-in slide-in-from-right-10 duration-200">
                    <div className="bg-blue-50 border border-blue-100 p-4 rounded-xl mb-4">
                        <div className="text-xs text-blue-600 uppercase font-bold mb-1">Selected Route</div>
                        <div className="font-bold text-blue-900 text-lg">{selectedRoute.name}</div>
                        <div className="text-sm text-blue-700">{selectedRoute.time} • {direction.toUpperCase()}</div>
                    </div>
                    <h3 className="font-semibold text-gray-500 mb-2 px-1">Available Stations</h3>
                    {STATIONS_DATA.map(station => (
                        <div 
                            key={station.id}
                            onClick={() => handleStationSelect(station)}
                            className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 hover:border-blue-300 active:scale-95 transition cursor-pointer flex justify-between items-center"
                        >
                            <div className="flex items-center gap-3">
                                <div className="bg-blue-50 p-2 rounded-full text-blue-500"><MapIcon size={20} /></div>
                                <div>
                                    <div className="font-bold text-gray-800">{station.name}</div>
                                    <div className="text-xs text-gray-500">{station.description}</div>
                                </div>
                            </div>
                            <ChevronRight size={18} className="text-gray-300" />
                        </div>
                    ))}
                </div>
            )}

            {/* STEP 3: Select Dates */}
            {step === 3 && selectedRoute && selectedStation && (
                <div className="flex flex-col h-full animate-in slide-in-from-right-10 duration-200">
                     <div className="bg-blue-50 p-4 rounded-xl mb-4 border border-blue-100">
                        <div className="flex justify-between items-start">
                            <div>
                                <span className="text-xs text-blue-600 font-bold uppercase">Summary</span>
                                <p className="font-bold text-gray-800 text-sm">{selectedRoute.name}</p>
                                <p className="text-xs text-gray-500 flex items-center gap-1 mt-1"><MapIcon size={12}/> {selectedStation.name}</p>
                            </div>
                            <div className="text-right">
                                <div className="font-mono text-xl font-bold text-blue-600">{selectedRoute.time}</div>
                            </div>
                        </div>
                    </div>

                    <div className="flex items-center gap-2 mb-3">
                        <Calendar size={18} className="text-gray-500" />
                        <h3 className="font-bold text-gray-700">Select Travel Dates</h3>
                    </div>

                    <div className="space-y-3 mb-32 overflow-y-auto no-scrollbar pb-4">
                        {availableDates.map((date) => {
                            const selected = selectedDates.some(d => d.getTime() === date.getTime());
                            const isWeekend = date.getDay() === 0 || date.getDay() === 6;

                            return (
                                <button
                                    key={date.getTime()}
                                    onClick={() => toggleDate(date)}
                                    className={`w-full p-4 rounded-xl border flex items-center justify-between transition-all
                                        ${selected ? 'bg-blue-600 border-blue-600 text-white shadow-md' : 'bg-white border-gray-200 hover:bg-gray-50'}
                                    `}
                                >
                                    <div className="flex items-center gap-4">
                                        <div className={`w-10 h-10 rounded-lg flex flex-col items-center justify-center font-bold text-sm
                                            ${selected ? 'bg-white/20 text-white' : isWeekend ? 'bg-red-50 text-red-600' : 'bg-gray-100 text-gray-700'}
                                        `}>
                                            <span className="text-[10px] uppercase">{date.toLocaleDateString('en-US', { weekday: 'short' })}</span>
                                            <span className="leading-none">{date.getDate()}</span>
                                        </div>
                                        <div className="text-left">
                                            <div className={`font-bold ${selected ? 'text-white' : 'text-gray-800'}`}>
                                                {date.toLocaleDateString(undefined, { day: 'numeric', month: 'long', year: 'numeric' })}
                                            </div>
                                            <div className={`text-xs ${selected ? 'text-blue-100' : 'text-gray-400'}`}>
                                                {selected ? 'Selected' : isWeekend ? 'Weekend' : 'Available'}
                                            </div>
                                        </div>
                                    </div>
                                    
                                    {selected ? (
                                        <div className="bg-white text-blue-600 p-1 rounded-full"><Check size={16} strokeWidth={4} /></div>
                                    ) : (
                                        <div className="w-6 h-6 rounded-full border-2 border-gray-200"></div>
                                    )}
                                </button>
                            );
                        })}
                    </div>
                    
                    {/* Fixed Bottom Action */}
                    <div className="fixed bottom-[56px] left-0 right-0 p-4 bg-white border-t border-gray-100 z-40 max-w-md mx-auto shadow-[0_-4px_20px_rgba(0,0,0,0.1)]">
                        <Button 
                            fullWidth 
                            disabled={selectedDates.length === 0} 
                            onClick={confirmBooking}
                            className="shadow-xl shadow-blue-900/20"
                        >
                            Confirm Booking ({selectedDates.length} days)
                        </Button>
                    </div>
                </div>
            )}
        </div>
    );
};

const MapPage = ({ lang, user, toggleLang }: any) => {
    const t = TRANSLATIONS[lang as Language];
    const navigate = useNavigate();
    const [userLocation, setUserLocation] = useState<[number, number] | undefined>(undefined);

    useEffect(() => {
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(
                (position) => {
                    setUserLocation([position.coords.latitude, position.coords.longitude]);
                },
                (error) => {
                    console.error("Error getting location", error);
                    // Default fallback or prompt
                }
            );
        }
    }, []);

    return (
        <div className="h-screen w-full flex flex-col relative">
            <div className="absolute top-4 left-4 z-10">
                <button onClick={() => navigate(-1)} className="p-3 bg-white rounded-full shadow-lg text-gray-700 hover:bg-gray-50">
                    <ArrowLeft size={24} />
                </button>
            </div>
            
            <MapComponent 
                stations={STATIONS_DATA}
                center={[14.0, 100.6]} // Rough center between Bangkok and Ayutthaya
                onStationSelect={(station) => {
                    Swal.fire({
                        title: station.name,
                        text: station.description,
                        confirmButtonText: 'OK'
                    });
                }}
                userLocation={userLocation}
            />
            
            <div className="absolute bottom-24 left-4 right-4 bg-white p-4 rounded-2xl shadow-xl z-10">
                <h3 className="font-bold text-gray-800 mb-2 flex items-center gap-2">
                    <MapIcon size={18} className="text-blue-600"/> {t.mapGps}
                </h3>
                <p className="text-xs text-gray-500">Showing all pickup points and your current location.</p>
            </div>
        </div>
    );
};

const QRPage = ({ user, lang }: any) => {
    const location = useLocation();
    const navigate = useNavigate();
    const t = TRANSLATIONS[lang as Language];
    const bookingId = location.state?.bookingId;
    const [booking, setBooking] = useState<Booking | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const loadBooking = async () => {
            if (bookingId) {
                const allBookings = await getBookings();
                const found = allBookings.find(b => b.id === bookingId);
                setBooking(found || null);
            } else {
                const active = await getUserActiveBooking(user.id);
                setBooking(active || null);
            }
            setLoading(false);
        };
        loadBooking();
    }, [bookingId, user.id]);

    if (loading) {
        return (
            <div className="p-8 flex flex-col items-center justify-center min-h-screen text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
                <p className="mt-4 text-gray-500">Loading...</p>
            </div>
        );
    }

    if (!booking) {
        return (
             <div className="p-8 flex flex-col items-center justify-center min-h-screen text-center">
                <AlertTriangle size={48} className="text-yellow-500 mb-4" />
                <h2 className="text-xl font-bold text-gray-800">Booking Not Found</h2>
                <Button className="mt-6" onClick={() => navigate('/')}>Back to Home</Button>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-blue-600 p-6 flex flex-col items-center justify-center text-white relative">
            <button onClick={() => navigate(-1)} className="absolute top-6 left-6 p-2 bg-white/20 rounded-full hover:bg-white/30 transition-colors">
                <ArrowLeft size={24} />
            </button>

            <div className="text-center mb-8">
                <h2 className="text-2xl font-bold mb-1">{t.myQr}</h2>
                <p className="text-blue-100 text-sm">Show this to the driver</p>
            </div>

            <div className="bg-white p-6 rounded-3xl shadow-2xl w-full max-w-xs text-gray-800">
                <div className="flex justify-center mb-6">
                    <QRCodeGen value={booking.id} />
                </div>

                <div className="text-center border-t border-gray-100 pt-6">
                    <h3 className="text-xl font-bold text-gray-900">{user.name}</h3>
                    <p className="text-gray-400 text-sm mb-4">{user.employeeId}</p>

                    <div className="bg-gray-50 rounded-xl p-4 text-left space-y-2">
                        <div className="flex justify-between">
                            <span className="text-xs text-gray-500">Route</span>
                            <span className="text-xs font-bold text-gray-900 text-right">{booking.routeName}</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-xs text-gray-500">Station</span>
                            <span className="text-xs font-bold text-gray-900 text-right">{booking.stationName}</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-xs text-gray-500">Time</span>
                            <span className="text-xs font-bold text-gray-900 text-right">
                                {new Date(booking.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                            </span>
                        </div>
                    </div>
                </div>
            </div>
            
            <p className="mt-8 text-xs text-blue-200 opacity-60">Booking ID: {booking.id}</p>
        </div>
    );
};

const Profile = ({ user, setUser, lang, toggleLang }: any) => {
    const t = TRANSLATIONS[lang as Language];
    const [isEditing, setIsEditing] = useState(false);
    const [formData, setFormData] = useState(user);
    const navigate = useNavigate();

    const handleSave = () => {
        saveUser(formData);
        setUser(formData);
        setIsEditing(false);
        Swal.fire({
            icon: 'success',
            title: 'Saved',
            text: 'Profile updated successfully',
            timer: 1500,
            showConfirmButton: false
        });
    };

    return (
        <div className="p-4 pb-24">
            <div className="flex items-center justify-between mb-6">
                 <div className="flex items-center gap-4">
                    <button 
                        onClick={() => navigate(-1)} 
                        className="p-2 bg-white rounded-full shadow-sm text-gray-700 hover:bg-gray-50 transition-colors"
                    >
                        <X size={20} />
                    </button>
                    <h2 className="text-xl font-bold text-gray-900">{t.profile}</h2>
                 </div>
                 <button 
                    onClick={toggleLang}
                    className="flex items-center gap-2 bg-blue-50 px-3 py-1.5 rounded-full text-sm font-bold text-blue-800 border border-blue-100 hover:bg-blue-100 transition-colors"
                >
                    <Globe size={16} className="text-blue-600" /> {lang.toUpperCase()}
                </button>
            </div>

            <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 mb-6 flex flex-col items-center">
                <div className="w-24 h-24 bg-blue-100 rounded-full flex items-center justify-center mb-4 text-blue-600 font-bold text-3xl">
                    {user.name.charAt(0)}
                </div>
                <h3 className="text-lg font-bold">{user.name}</h3>
                <p className="text-gray-500">{user.employeeId}</p>
            </div>

            <div className="space-y-4">
                <Button fullWidth variant="outline" onClick={() => navigate('/history')} className="mb-2">
                    <History size={20} /> {t.history}
                </Button>

                <Input label={t.fullName} value={formData.name} onChange={(e: any) => setFormData({...formData, name: e.target.value})} disabled={!isEditing} />
                <Input label={t.phone} value={formData.phone} onChange={(e: any) => setFormData({...formData, phone: e.target.value})} disabled={!isEditing} />
                <Input label={t.dept} value={formData.department} onChange={(e: any) => setFormData({...formData, department: e.target.value})} disabled={!isEditing} />
                
                {isEditing ? (
                    <div className="flex gap-2">
                        <Button fullWidth onClick={handleSave} className="flex-1">Save</Button>
                        <Button fullWidth variant="secondary" onClick={() => setIsEditing(false)} className="flex-1">Cancel</Button>
                    </div>
                ) : (
                    <Button fullWidth variant="secondary" onClick={() => setIsEditing(true)}>Edit Profile</Button>
                )}
                
                <Button fullWidth variant="danger" onClick={() => { logoutUser(); setUser(null); }}>{t.logout}</Button>
            </div>
        </div>
    );
}

// --- Layout & Main App ---

const BottomNav = ({ role, lang }: any) => {
    const navigate = useNavigate();
    const location = useLocation();
    const t = TRANSLATIONS[lang as Language];

    const isActive = (path: string) => location.pathname === path;
    
    const NavItem = ({ path, icon: Icon, label }: any) => (
        <button 
            onClick={() => navigate(path)}
            className={`flex flex-col items-center justify-center w-full py-2 transition-colors ${isActive(path) ? 'text-blue-600' : 'text-gray-400'}`}
        >
            <Icon size={24} className={`mb-1 transition-transform ${isActive(path) ? 'scale-110' : ''}`} strokeWidth={isActive(path) ? 2.5 : 2} />
            <span className="text-[10px] font-medium">{label}</span>
        </button>
    );

    if (role === UserRole.DRIVER) {
        return (
            <div className="fixed bottom-0 left-0 w-full bg-white border-t border-gray-200 flex justify-between px-2 pb-safe z-30 shadow-[0_-5px_10px_rgba(0,0,0,0.05)]">
                <NavItem path="/driver" icon={Bus} label="Driver" />
                <NavItem path="/profile" icon={UserIcon} label={t.profile} />
            </div>
        );
    }

    return (
        <div className="fixed bottom-0 left-0 w-full bg-white border-t border-gray-200 flex justify-between px-2 pb-safe z-30 shadow-[0_-5px_10px_rgba(0,0,0,0.05)]">
            <NavItem path="/" icon={Bus} label={t.home} />
            <NavItem path="/book" icon={PlusCircle} label={t.booking} />
            <NavItem path="/map" icon={MapIcon} label={t.map} />
            {role === UserRole.ADMIN && <NavItem path="/admin" icon={Settings} label={t.admin} />}
            <NavItem path="/profile" icon={UserIcon} label={t.profile} />
        </div>
    );
};

const AppContent = () => {
  const [user, setUser] = useState<User | null>(getStoredUser());
  const [lang, setLang] = useState<Language>(Language.TH);

  // Toggle Language
  const toggleLang = () => setLang(l => l === Language.TH ? Language.EN : Language.TH);

  if (!user) {
    return (
        <>
            <div className="absolute top-4 right-4 z-50">
                <button onClick={toggleLang} className="flex items-center gap-2 bg-white px-4 py-2 rounded-full text-sm font-bold shadow-md text-blue-900 border border-blue-100 hover:bg-blue-50 transition-all">
                    <Globe size={16} className="text-blue-600" /> {lang.toUpperCase()}
                </button>
            </div>
            <Login onLogin={(u: User) => { saveUser(u); setUser(u); }} lang={lang} />
        </>
    );
  }

  return (
    <div className="max-w-md mx-auto min-h-screen bg-gray-50 relative shadow-2xl overflow-hidden">
       {/* Removed global absolute Language Switcher Overlay to prevent blocking UI */}
       
       <div className="h-full overflow-y-auto no-scrollbar">
          <Routes>
            <Route path="/" element={user.role === UserRole.DRIVER ? <Navigate to="/driver" /> : <Home user={user} lang={lang} toggleLang={toggleLang} />} />
            <Route path="/book" element={<BookingFlow user={user} lang={lang} />} />
            <Route path="/map" element={<MapPage lang={lang} user={user} toggleLang={toggleLang} />} />
            <Route path="/history" element={<BookingHistory user={user} lang={lang} />} />
            <Route path="/qr" element={<QRPage user={user} lang={lang} />} />
            <Route path="/profile" element={<Profile user={user} setUser={setUser} lang={lang} toggleLang={toggleLang} />} />
            <Route path="/admin" element={user.role === UserRole.ADMIN ? <AdminDashboard lang={lang} toggleLang={toggleLang} /> : <Navigate to="/" />} />
            <Route path="/driver" element={user.role === UserRole.DRIVER ? <DriverDashboard user={user} lang={lang} /> : <Navigate to="/" />} />
            <Route path="*" element={<Navigate to="/" />} />
          </Routes>
       </div>
       
       <BottomNav role={user.role} lang={lang} />
    </div>
  );
};

const App = () => {
  return (
    <HashRouter>
        <AppContent />
    </HashRouter>
  );
};

export default App;