import { useState } from 'react';
import { createResource, updateResource, deleteResource } from '../api/resourceCenter.api';

interface MutationOptions {
  resourceType: string;
  onSuccess?: (message: string) => void;
  onError?: (error: Error) => void;
}

export function useCreateResourceRecord({ resourceType, onSuccess, onError }: MutationOptions) {
  const [isSubmitting, setIsSubmitting] = useState(false);

  const mutate = async (payload: any) => {
    setIsSubmitting(true);
    try {
      await createResource(resourceType, payload);
      if (onSuccess) onSuccess('Record created successfully');
    } catch (err: any) {
      if (onError) onError(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return { mutate, isSubmitting };
}

export function useUpdateResourceRecord({ resourceType, onSuccess, onError }: MutationOptions) {
  const [isSubmitting, setIsSubmitting] = useState(false);

  const mutate = async (id: number, payload: any) => {
    setIsSubmitting(true);
    try {
      await updateResource(resourceType, id, payload);
      if (onSuccess) onSuccess('Record updated successfully');
    } catch (err: any) {
      if (onError) onError(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return { mutate, isSubmitting };
}

export function useDeleteResourceRecord({ resourceType, onSuccess, onError }: MutationOptions) {
  const [isSubmitting, setIsSubmitting] = useState(false);

  const mutate = async (id: number) => {
    setIsSubmitting(true);
    try {
      await deleteResource(resourceType, id);
      if (onSuccess) onSuccess('Record deleted successfully');
    } catch (err: any) {
      if (onError) onError(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return { mutate, isSubmitting };
}
