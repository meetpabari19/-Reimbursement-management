import { Check, X } from 'lucide-react';

export type StepStatus = 'done' | 'active' | 'waiting' | 'rejected';

interface Step {
  status: StepStatus;
  label: string;
}

interface ApprovalStepperProps {
  steps: Step[];
}

export function ApprovalStepper({ steps }: ApprovalStepperProps) {
  return (
    <div className="flex items-center gap-1">
      {steps.map((step, index) => (
        <div key={index} className="flex items-center">
          {/* Circle */}
          <div className="flex flex-col items-center">
            <div
              className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold transition-all ${
                step.status === 'done'
                  ? 'bg-[#2f6dff] text-white'
                  : step.status === 'active'
                  ? 'bg-[#fff4db] border-2 border-[#f5a038] text-[#9b6f1b]'
                  : step.status === 'rejected'
                  ? 'bg-[#fde5e5] border-2 border-[#9b3434] text-[#9b3434]'
                  : 'bg-white border-2 border-[#d8e3f2] text-[#6f85a8]'
              }`}
            >
              {step.status === 'done' ? (
                <Check className="w-4 h-4" />
              ) : step.status === 'rejected' ? (
                <X className="w-4 h-4" />
              ) : (
                index + 1
              )}
            </div>
            <span className="text-xs mt-1 text-[#6f85a8] whitespace-nowrap">
              {step.label}
            </span>
          </div>

          {/* Connecting line */}
          {index < steps.length - 1 && (
            <div
              className={`w-12 h-0.5 mx-1 ${
                steps[index].status === 'done'
                  ? 'bg-[#2f6dff]'
                  : 'bg-[#d8e3f2]'
              }`}
            />
          )}
        </div>
      ))}
    </div>
  );
}
