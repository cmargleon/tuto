interface WizardStepperProps {
  currentStep: number;
  steps: string[];
}

export const WizardStepper = ({ currentStep, steps }: WizardStepperProps) => (
  <div className="wizard-stepper">
    {steps.map((step, index) => {
      const stepNumber = index + 1;
      const state =
        stepNumber === currentStep ? 'current' : stepNumber < currentStep ? 'complete' : 'upcoming';

      return (
        <div key={step} className={`wizard-step wizard-step-${state}`}>
          <div className="wizard-step-number">{stepNumber}</div>
          <div className="wizard-step-copy">
            <span>{step}</span>
          </div>
        </div>
      );
    })}
  </div>
);
