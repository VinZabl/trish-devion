import React from 'react';
import { X, CheckCircle } from 'lucide-react';

interface WelcomeModalProps {
  username: string;
  onClose: () => void;
  onGetStarted: () => void;
}

const WelcomeModal: React.FC<WelcomeModalProps> = ({ username, onClose, onGetStarted }) => {
  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
      <div className="glass-card rounded-xl p-6 max-w-md w-full max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-2xl font-semibold text-cafe-text">Welcome {username}!</h2>
            <p className="text-sm text-cafe-textMuted mt-1">
              You have successfully logged in
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 glass-strong rounded-lg hover:bg-cafe-primary/20 transition-colors duration-200"
          >
            <X className="h-5 w-5 text-cafe-text" />
          </button>
        </div>

        <div className="text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-r from-cafe-primary to-cafe-secondary rounded-full mb-4">
            <CheckCircle className="h-8 w-8 text-white" />
          </div>
          <p className="text-cafe-textMuted mb-6">
            Enjoy exclusive member benefits!
          </p>
          <button
            onClick={() => {
              onClose();
              onGetStarted();
            }}
            className="px-6 py-3 bg-gradient-to-r from-cafe-primary to-cafe-secondary text-white rounded-lg font-semibold hover:opacity-90 transition-opacity"
          >
            Get Started
          </button>
        </div>
      </div>
    </div>
  );
};

export default WelcomeModal;
