import { v4 as uuidv4 } from 'uuid';

const DEVICE_ID_KEY = 'prolt_device_id';

/**
 * Retrieves the existing device ID from local storage or generates a new one if it doesn't exist.
 * The device ID is a UUID string.
 */
export const getDeviceId = (): string => {
    let deviceId = localStorage.getItem(DEVICE_ID_KEY);

    if (!deviceId) {
        deviceId = uuidv4();
        localStorage.setItem(DEVICE_ID_KEY, deviceId);
    }

    return deviceId;
};
