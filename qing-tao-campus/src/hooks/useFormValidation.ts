/**
 * useFormValidation — 表单校验 Hook
 *
 * 基于 Zod schema，提供实时校验 + 提交前校验
 *
 * 用法:
 *   const { errors, validate, validateField, isValid } = useFormValidation(createGoodsSchema);
 */
import { useState, useCallback } from 'react';
import { ZodSchema, ZodError } from 'zod';

interface FieldError {
  field: string;
  message: string;
}

export function useFormValidation(schema?: ZodSchema) {
  const [errors, setErrors] = useState<FieldError[]>([]);

  const validate = useCallback(
    (data: unknown): boolean => {
      if (!schema) return true;
      try {
        schema.parse(data);
        setErrors([]);
        return true;
      } catch (err) {
        if (err instanceof ZodError) {
          const fieldErrors = err.issues.map((e) => ({
            field: e.path.join('.'),
            message: e.message,
          }));
          setErrors(fieldErrors);
        }
        return false;
      }
    },
    [schema],
  );

  const validateField = useCallback(
    (field: string, value: unknown) => {
      if (!schema) return;
      // 对单个字段做校验（可选扩展）
      setErrors((prev) => prev.filter((e) => e.field !== field));
    },
    [schema],
  );

  const clearErrors = useCallback(() => setErrors([]), []);
  const getFieldError = useCallback(
    (field: string) => errors.find((e) => e.field === field)?.message,
    [errors],
  );

  return {
    errors,
    validate,
    validateField,
    clearErrors,
    getFieldError,
    isValid: errors.length === 0,
  };
}
