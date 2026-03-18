interface WizardStepperProps {
  currentStep: number;
  steps: string[];
  onStepSelect?: (step: number) => void;
  canSelectStep?: (step: number) => boolean;
}

export const WizardStepper = ({ currentStep, steps, onStepSelect, canSelectStep }: WizardStepperProps) => (
  <div className="wizard-stepper">
    {steps.map((step, index) => {
      const stepNumber = index + 1;
      const state =
        stepNumber === currentStep ? 'current' : stepNumber < currentStep ? 'complete' : 'upcoming';
      const isSelectable = canSelectStep?.(stepNumber) ?? Boolean(onStepSelect);

      return (
        <button
          key={step}
          type="button"
          className={`wizard-step wizard-step-${state}`}
          disabled={!isSelectable}
          onClick={() => onStepSelect?.(stepNumber)}
        >
          <div className="wizard-step-number">{stepNumber}</div>
          <div className="wizard-step-copy">
            <span>{step}</span>
          </div>
        </button>
      );
    })}
  </div>
);
