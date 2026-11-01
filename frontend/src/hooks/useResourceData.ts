import { useState, useEffect, useCallback } from 'react';
import { getResourceData, uploadBulk } from '../api/resourceCenter.api';

export function useResourceData<T>(resourceType: string) {
  const [data, setData] = useState<T[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchResource = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await getResourceData<T>(resourceType);
      if (res.success) {
        setData(res.data);
      } else {
        setError(res.message || 'Unknown error occurred');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to connect to the server');
    } finally {
      setLoading(false);
    }
  }, [resourceType]);

  useEffect(() => {
    fetchResource();
  }, [fetchResource]);

  const bulkUploadData = async (payloadArray: any[]) => {
    return await uploadBulk(resourceType, payloadArray);
  };

  return { data, loading, error, refresh: fetchResource, bulkUpload: bulkUploadData };
}
