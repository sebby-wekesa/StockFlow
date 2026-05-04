'use client'

import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useState, useEffect } from 'react'
import { Loader2, Package, Zap, AlertCircle } from 'lucide-react'
import { useToast } from './Toast'
import { Design } from '@/types'

// Enhanced schema with priority field
const createProductionOrderSchema = z.object({
  designId: z.string().min(1, 'Design is required'),
  initialWeight: z.coerce
    .number()
    .positive('Initial weight must be a positive number')
    .max(10000, 'Initial weight cannot exceed 10,000 kg'),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH'], {
    errorMap: () => ({ message: 'Please select a priority level' }),
  }),
})

type ProductionOrderFormData = z.infer<typeof createProductionOrderSchema>

interface CreateProductionOrderFormProps {
  designs: Design[]
  onSuccess?: () => void
}

export function CreateProductionOrderForm({
  designs,
  onSuccess,
}: CreateProductionOrderFormProps) {
  const { showToast } = useToast()
  const [isLoading, setIsLoading] = useState(false)
  const [orderNumber, setOrderNumber] = useState('')
  const [selectedDesign, setSelectedDesign] = useState<Design | null>(null)

  const {
    register,
    handleSubmit,
    formState: { errors, isValid },
    watch,
    reset,
  } = useForm<ProductionOrderFormData>({
    resolver: zodResolver(createProductionOrderSchema),
    mode: 'onChange',
  })

  const designId = watch('designId')
  const initialWeight = watch('initialWeight')
  const priority = watch('priority')

  // Generate order number
  useEffect(() => {
    const timestamp = new Date()
    const year = timestamp.getFullYear()
    const randomNum = String(Math.floor(Math.random() * 10000)).padStart(4, '0')
    setOrderNumber(`ORD-${year}-${randomNum}`)
  }, [])

  // Update selected design when designId changes
  useEffect(() => {
    const design = designs.find((d) => d.id === designId)
    setSelectedDesign(design || null)
  }, [designId, designs])

  const onSubmit = async (data: ProductionOrderFormData) => {
    setIsLoading(true)

    try {
      // Mock API call
      const payload = {
        orderNumber,
        ...data,
        designName: selectedDesign?.name,
      }

      console.log('Submitting production order:', payload)

      // Simulate API call
      const response = await fetch('/api/production-orders', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      })

      if (!response.ok) {
        throw new Error('Failed to create production order')
      }

      const result = await response.json()

      showToast(
        `Production order ${orderNumber} created successfully!`,
        'success'
      )

      // Reset form
      reset()
      setOrderNumber(
        `ORD-${new Date().getFullYear()}-${String(Math.floor(Math.random() * 10000)).padStart(4, '0')}`
      )
      setSelectedDesign(null)

      onSuccess?.()
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : 'Failed to create production order'
      showToast(message, 'error')
      console.error('Error creating production order:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const priorityConfig = {
    LOW: { label: 'Low', color: 'text-emerald-400', bg: 'bg-emerald-900/20' },
    MEDIUM: {
      label: 'Medium',
      color: 'text-amber-400',
      bg: 'bg-amber-900/20',
    },
    HIGH: { label: 'High', color: 'text-red-400', bg: 'bg-red-900/20' },
  } as const

  return (
    <div className="card">
      <div className="section-header">
        <div>
          <div className="section-title">Create Production Order</div>
          <div className="section-sub">Initialize a new manufacturing order in the system</div>
        </div>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* Order Number (Read-only) */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <label style={{
              fontSize: '12px',
              color: 'var(--muted)',
              textTransform: 'uppercase',
              letterSpacing: '0.5px',
              fontWeight: 600
            }}>
              Order Number
            </label>
            <input
              type="text"
              value={orderNumber}
              disabled
              style={{
                width: '100%',
                background: 'var(--surface2)',
                border: '1px solid var(--border2)',
                borderRadius: 'var(--radius-sm)',
                padding: '8px 12px',
                color: 'var(--muted)',
                fontSize: '14px',
                cursor: 'not-allowed',
                opacity: 0.6
              }}
            />
            <p style={{
              fontSize: '11px',
              color: 'var(--muted)',
              marginTop: '4px'
            }}>
              Auto-generated • Read-only
            </p>
          </div>

          {/* Design Selection */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <label style={{
              fontSize: '12px',
              color: 'var(--muted)',
              textTransform: 'uppercase',
              letterSpacing: '0.5px',
              fontWeight: 600
            }}>
              Design Selection *
            </label>
            <select
              {...register('designId')}
              style={{
                width: '100%',
                background: 'var(--surface2)',
                border: '1px solid var(--border2)',
                borderRadius: 'var(--radius-sm)',
                padding: '8px 12px',
                color: 'var(--text)',
                fontSize: '14px',
                outline: 'none',
                cursor: 'pointer'
              }}
              onFocus={(e) => e.target.style.borderColor = 'var(--accent)'}
              onBlur={(e) => e.target.style.borderColor = errors.designId ? 'var(--red)' : 'var(--border2)'}
            >
              <option value="">Select a design...</option>
              {designs.map((design) => (
                <option key={design.id} value={design.id}>
                  {design.name}
                  {` (${design.kgPerUnit} kg)`}
                </option>
              ))}
            </select>
            {errors.designId && (
              <p style={{
                fontSize: '12px',
                color: 'var(--red)',
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                marginTop: '4px'
              }}>
                <AlertCircle size={14} />
                {errors.designId.message}
              </p>
            )}
            {selectedDesign?.description && (
              <p style={{
                fontSize: '11px',
                color: 'var(--muted)',
                fontStyle: 'italic',
                marginTop: '6px'
              }}>
                {selectedDesign.description}
              </p>
            )}
          </div>

          {/* Initial Weight */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <label style={{
              fontSize: '12px',
              color: 'var(--muted)',
              textTransform: 'uppercase',
              letterSpacing: '0.5px',
              fontWeight: 600
            }}>
              Initial Weight (kg) *
            </label>
            <input
              type="number"
              step="0.01"
              min="0"
              placeholder="Enter weight in kilograms"
              {...register('initialWeight', { valueAsNumber: true })}
              style={{
                width: '100%',
                background: 'var(--surface2)',
                border: '1px solid var(--border2)',
                borderRadius: 'var(--radius-sm)',
                padding: '8px 12px',
                color: 'var(--text)',
                fontSize: '14px',
                outline: 'none'
              }}
              onFocus={(e) => e.target.style.borderColor = 'var(--accent)'}
              onBlur={(e) => e.target.style.borderColor = errors.initialWeight ? 'var(--red)' : 'var(--border2)'}
            />
            {errors.initialWeight && (
              <p style={{
                fontSize: '12px',
                color: 'var(--red)',
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                marginTop: '4px'
              }}>
                <AlertCircle size={14} />
                {errors.initialWeight.message}
              </p>
            )}
          </div>

          {/* Priority Selection */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <label style={{
              fontSize: '12px',
              color: 'var(--muted)',
              textTransform: 'uppercase',
              letterSpacing: '0.5px',
              fontWeight: 600,
              marginBottom: '8px'
            }}>
              Priority Level *
            </label>
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(3, 1fr)',
              gap: '8px'
            }}>
              {(Object.keys(priorityConfig) as (keyof typeof priorityConfig)[]).map((level) => {
                const config = priorityConfig[level]
                const isSelected = priority === level
                return (
                  <label
                    key={level}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      padding: '10px 12px',
                      borderRadius: 'var(--radius-sm)',
                      border: `2px solid ${isSelected ? 'var(--accent)' : 'var(--border2)'}`,
                      background: isSelected ? 'rgba(240,192,64,0.1)' : 'var(--surface2)',
                      cursor: 'pointer',
                      transition: 'all 0.15s'
                    }}
                  >
                    <input
                      type="radio"
                      value={level}
                      {...register('priority')}
                      style={{ position: 'absolute', opacity: 0, pointerEvents: 'none' }}
                    />
                    <span
                      style={{
                        width: '12px',
                        height: '12px',
                        borderRadius: '50%',
                        border: `2px solid ${isSelected ? 'var(--accent)' : 'var(--muted)'}`,
                        background: isSelected ? 'var(--accent)' : 'transparent',
                        transition: 'all 0.15s'
                      }}
                    />
                    <span style={{
                      fontSize: '13px',
                      fontWeight: 500,
                      color: config.color === 'text-emerald-400' ? 'var(--green)' :
                             config.color === 'text-amber-400' ? 'var(--accent)' :
                             'var(--red)'
                    }}>
                      {config.label}
                    </span>
                  </label>
                )
              })}
            </div>
            {errors.priority && (
              <p style={{
                fontSize: '12px',
                color: 'var(--red)',
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                marginTop: '4px'
              }}>
                <AlertCircle size={14} />
                {errors.priority.message}
              </p>
            )}
          </div>

          {/* Summary Section */}
          {(designId || initialWeight) && (
            <div style={{
              background: 'rgba(74,158,255,0.1)',
              border: '1px solid rgba(74,158,255,0.2)',
              borderRadius: 'var(--radius)',
              padding: '16px'
            }}>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                marginBottom: '12px'
              }}>
                <Zap size={18} style={{ color: 'var(--blue)' }} />
                <h3 style={{
                  fontSize: '14px',
                  fontWeight: 600,
                  color: 'var(--blue)',
                  fontFamily: 'var(--font-head)'
                }}>
                  Order Summary
                </h3>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '13px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--muted)' }}>Order Number:</span>
                  <span style={{ fontWeight: 500, color: 'var(--text)' }}>{orderNumber}</span>
                </div>
                {selectedDesign && (
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: 'var(--muted)' }}>Design:</span>
                    <span style={{ fontWeight: 500, color: 'var(--text)' }}>
                      {selectedDesign.name}
                    </span>
                  </div>
                )}
                {initialWeight && (
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: 'var(--muted)' }}>Initial Weight:</span>
                    <span style={{ fontWeight: 500, color: 'var(--green)' }}>
                      {initialWeight} kg
                    </span>
                  </div>
                )}
                {priority && (
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: 'var(--muted)' }}>Priority:</span>
                    <span style={{
                      fontWeight: 500,
                      color: priorityConfig[priority].color === 'text-emerald-400' ? 'var(--green)' :
                             priorityConfig[priority].color === 'text-amber-400' ? 'var(--accent)' :
                             'var(--red)'
                    }}>
                      {priorityConfig[priority].label}
                    </span>
                  </div>
                )}
                <div style={{
                  borderTop: '1px solid rgba(74,158,255,0.2)',
                  paddingTop: '8px',
                  marginTop: '8px',
                  display: 'flex',
                  justifyContent: 'space-between'
                }}>
                  <span style={{ color: 'var(--text)', fontWeight: 600 }}>
                    Total Weight Introduced:
                  </span>
                  <span style={{ fontWeight: 600, color: 'var(--blue)' }}>
                    {initialWeight || 0} kg
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Submit Button */}
          <button
            type="submit"
            disabled={isLoading || !isValid}
            className="btn-primary"
            style={{
              width: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              padding: '12px',
              opacity: (isLoading || !isValid) ? 0.6 : 1,
              cursor: (isLoading || !isValid) ? 'not-allowed' : 'pointer'
            }}
          >
            {isLoading ? (
              <>
                <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} />
                Creating Order...
              </>
            ) : (
              <>
                <Package size={16} />
                Create Production Order
              </>
            )}
          </button>

          {/* Form Info */}
          <p style={{
            fontSize: '11px',
            color: 'var(--muted)',
            textAlign: 'center',
            marginTop: '12px'
          }}>
            * Required fields • All data is validated before submission
          </p>
        </form>
      </div>
    </div>
  )
}
