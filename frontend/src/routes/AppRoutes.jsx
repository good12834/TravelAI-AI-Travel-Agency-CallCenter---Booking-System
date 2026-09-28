import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { MainLayout } from '../components/layout/MainLayout';
import { Login } from '../pages/Login';
import { Dashboard } from '../pages/Dashboard';
import { Calls } from '../pages/Calls';
import { LiveCalls } from '../pages/LiveCalls';
import { CallDetails } from '../pages/CallDetails';
import { Customers } from '../pages/Customers';
import { CustomerDetails } from '../pages/CustomerDetails';
import { Bookings } from '../pages/Bookings';
import { CreateBooking } from '../pages/CreateBooking';
import { BookingDetails } from '../pages/BookingDetails';
import { Flights } from '../pages/Flights';
import { Hotels } from '../pages/Hotels';
import { Tours } from '../pages/Tours';
import { Messages } from '../pages/Messages';
import { Agents } from '../pages/Agents';
import { Analytics } from '../pages/Analytics';
import { KnowledgeBase } from '../pages/KnowledgeBase';
import { Notifications } from '../pages/Notifications';
import { Settings } from '../pages/Settings';

export const AppRoutes = () => {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />

      {/* Main Layout Protected Shell */}
      <Route path="/" element={<MainLayout />}>
        <Route index element={<Navigate to="/dashboard" replace />} />
        <Route path="dashboard" element={<Dashboard />} />
        <Route path="calls" element={<Calls />} />
        <Route path="calls/live" element={<LiveCalls />} />
        <Route path="calls/:id" element={<CallDetails />} />
        <Route path="customers" element={<Customers />} />
        <Route path="customers/:id" element={<CustomerDetails />} />
        <Route path="bookings" element={<Bookings />} />
        <Route path="bookings/create" element={<CreateBooking />} />
        <Route path="bookings/:id" element={<BookingDetails />} />
        <Route path="flights" element={<Flights />} />
        <Route path="hotels" element={<Hotels />} />
        <Route path="tours" element={<Tours />} />
        <Route path="messages" element={<Messages />} />
        <Route path="agents" element={<Agents />} />
        <Route path="analytics" element={<Analytics />} />
        <Route path="knowledge-base" element={<KnowledgeBase />} />
        <Route path="notifications" element={<Notifications />} />
        <Route path="settings" element={<Settings />} />
      </Route>

      {/* Fallback */}
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
};
