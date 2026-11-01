import { useState, useEffect } from "react";

export interface LiveMeterData {
  // Voltage readings (R, Y, B phases)
  voltageR: number;
  voltageY: number;
  voltageB: number;
  // Current readings (R, Y, B phases)
  currentR: number;
  currentY: number;
  currentB: number;
  // Load readings
  loadKW: number;
  loadKVA: number;
  loadKVAr: number;
  // Power factor
  powerFactor: number;
  // Frequency (Hz)
  frequency: number;
  // Slot info
  currentSlotStart: string;
  currentSlotEnd: string;
  // Status
  isActive: boolean;
  lastUpdated: Date;
}

const formatTime = (totalMinutes: number): string => {
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
};

export function useLiveMeterData(): LiveMeterData | null {
  const [liveData, setLiveData] = useState<LiveMeterData | null>(null);

  useEffect(() => {
    const getCurrentSlot = () => {
      const now = new Date();
      const minutes = now.getHours() * 60 + now.getMinutes();
      const slotIndex = Math.floor(minutes / 15);
      const slotStartMinutes = slotIndex * 15;
      const slotEndMinutes = Math.min(slotStartMinutes + 15, 24 * 60);

      return {
        slotStart: formatTime(slotStartMinutes),
        slotEnd: formatTime(slotEndMinutes),
        slotIndex
      };
    };

    const updateLiveData = () => {
      const slot = getCurrentSlot();
      // Simulated live meter data - in production this would come from WebSocket/API
      const baseVoltage = 230;
      const baseCurrent = 15;
      const baseLoadKW = 30 + Math.sin(slot.slotIndex / 10) * 15;
      
      setLiveData({
        voltageR: baseVoltage + (Math.random() - 0.5) * 10,
        voltageY: baseVoltage + (Math.random() - 0.5) * 10,
        voltageB: baseVoltage + (Math.random() - 0.5) * 10,
        currentR: baseCurrent + Math.random() * 5,
        currentY: baseCurrent + Math.random() * 5,
        currentB: baseCurrent + Math.random() * 5,
        loadKW: baseLoadKW + Math.random() * 10,
        loadKVA: (baseLoadKW + Math.random() * 10) * 1.1,
        loadKVAr: (baseLoadKW + Math.random() * 10) * 0.3,
        powerFactor: 0.85 + Math.random() * 0.1,
        frequency: 50 + (Math.random() - 0.5) * 0.4,
        currentSlotStart: slot.slotStart,
        currentSlotEnd: slot.slotEnd,
        isActive: true,
        lastUpdated: new Date()
      });
    };

    updateLiveData();
    // Update every 15 seconds for real-time feel
    const interval = setInterval(updateLiveData, 15000);

    return () => clearInterval(interval);
  }, []);

  return liveData;
}
