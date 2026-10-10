import { useCallback, useEffect, useRef, useState } from 'react';

const getSpeechRecognition = () => {
  if (typeof window === 'undefined') return null;
  return window.SpeechRecognition || window.webkitSpeechRecognition || null;
};

/**
 * Web Speech API hook for continuous dictation into a callback.
 */
export function useSpeechRecognition({ onResult, onError, onEnd, lang = 'en-US', continuous = true } = {}) {
  const [isListening, setIsListening] = useState(false);
  const [supported, setSupported] = useState(false);
  const recognitionRef = useRef(null);

  useEffect(() => {
    setSupported(!!getSpeechRecognition());
  }, []);

  const stop = useCallback(() => {
    recognitionRef.current?.stop();
    setIsListening(false);
  }, []);

  const start = useCallback(() => {
    const SpeechRecognition = getSpeechRecognition();
    if (!SpeechRecognition) {
      onError?.('Speech recognition is not supported in this browser.');
      return;
    }

    if (recognitionRef.current) {
      recognitionRef.current.stop();
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = continuous;
    recognition.interimResults = true;
    recognition.lang = lang;

    recognition.onresult = (event) => {
      let transcript = '';
      for (let i = event.resultIndex; i < event.results.length; i++) {
        transcript += event.results[i][0].transcript;
      }
      if (transcript) onResult?.(transcript, event.results[event.results.length - 1]?.isFinal);
    };

    recognition.onerror = (event) => {
      setIsListening(false);
      if (event.error !== 'aborted') {
        onError?.(event.error === 'not-allowed' ? 'Microphone permission denied.' : event.error);
      }
    };

    recognition.onend = () => {
      setIsListening(false);
      onEnd?.();
    };

    recognitionRef.current = recognition;

    try {
      recognition.start();
      setIsListening(true);
    } catch {
      onError?.('Could not start speech recognition.');
    }
  }, [lang, onError, onResult]);

  const toggle = useCallback(() => {
    if (isListening) stop();
    else start();
  }, [isListening, start, stop]);

  useEffect(() => {
    return () => {
      recognitionRef.current?.abort?.();
      recognitionRef.current?.stop?.();
    };
  }, []);

  return { isListening, supported, start, stop, toggle };
}

export default useSpeechRecognition;
