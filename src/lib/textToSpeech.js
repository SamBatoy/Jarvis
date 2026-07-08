import { useEffect, useRef, useState } from 'react'

// Browser-native text-to-speech via the Web Speech API's SpeechSynthesis
// interface — same reasoning as speechToText.js: free, no server round
// trip, no new API key. Support is broader than SpeechRecognition (Firefox
// does implement this one), but still feature-detected and callers should
// hide voice-mode controls entirely when unsupported, same pattern as the
// mic button.
export function useTextToSpeech() {
  const [speaking, setSpeaking] = useState(false)
  const utteranceRef = useRef(null)

  function speak(text) {
    if (!text || typeof window === 'undefined' || !window.speechSynthesis) return
    // Cancel anything mid-utterance rather than queueing — a new reply
    // should replace whatever Jarvis was saying, not queue up behind it.
    window.speechSynthesis.cancel()

    const utterance = new SpeechSynthesisUtterance(text)
    utterance.onstart = () => setSpeaking(true)
    utterance.onend = () => setSpeaking(false)
    utterance.onerror = () => setSpeaking(false)
    utteranceRef.current = utterance
    window.speechSynthesis.speak(utterance)
  }

  function stop() {
    window.speechSynthesis?.cancel()
    setSpeaking(false)
  }

  useEffect(() => () => window.speechSynthesis?.cancel(), [])

  return {
    supported: typeof window !== 'undefined' && 'speechSynthesis' in window,
    speaking,
    speak,
    stop,
  }
}
