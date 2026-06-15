import {
  getStatusOrder,
  getStepperStatuses,
  NEGATIVE_OUTCOMES,
  type ApplicationStatus,
} from '@/lib/applicationStatus'
import styles from './StatusStepper.module.css'

interface StatusStepperProps {
  status: ApplicationStatus
  onStatusChange: (status: ApplicationStatus) => void
}

export function StatusStepper({ status, onStatusChange }: StatusStepperProps) {
  const steps = getStepperStatuses()
  const currentOrder = getStatusOrder(status)

  return (
    <div
      className={styles.stepper}
      role="group"
      aria-label="Application status"
    >
      {steps.map((step, index) => {
        const stepOrder = step.order
        const isActive = status === step.id
        const isNegative = NEGATIVE_OUTCOMES.includes(status)
        const isComplete = currentOrder > stepOrder && !isNegative
        const isRejected =
          (step.id === 'rejected' || step.id === 'ghosted') && status === step.id

        const stepClass = [
          styles.stepBtn,
          isActive && styles.stepBtnActive,
          isComplete && styles.stepBtnComplete,
          isRejected && styles.stepBtnRejected,
        ]
          .filter(Boolean)
          .join(' ')

        return (
          <div key={step.id} className={styles.step}>
            <button
              type="button"
              className={stepClass}
              onClick={() => onStatusChange(step.id)}
              aria-pressed={isActive}
              title={`Set status to ${step.label}`}
            >
              <span className={styles.dot} aria-hidden="true" />
              <span className={styles.label}>{step.label}</span>
            </button>
            {index < steps.length - 1 && (
              <span
                className={`${styles.connector} ${isComplete ? styles.connectorComplete : ''}`}
                aria-hidden="true"
              />
            )}
          </div>
        )
      })}
    </div>
  )
}
