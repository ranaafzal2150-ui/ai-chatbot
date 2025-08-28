import React, { useState, useRef, useEffect } from "react";

export default function ChatBox() {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [pending, setPending] = useState(false);
  const chatEndRef = useRef(null);

  // Use localhost in dev, relative path in prod
  const API_BASE =
    (import.meta && import.meta.env && import.meta.env.VITE_API_BASE) ||
    (window.location.hostname === "localhost" ? "http://localhost:5000" : "");

  const sendMessage = async () => {
    const text = input.trim();
    if (!text || pending) return;

    const userMessage = { text, sender: "user" };
    const loadingMessage = { text: "Typing...", sender: "bot", loading: true };

    // Add both at once to avoid flicker/race
    setMessages((prev) => [...prev, userMessage, loadingMessage]);
    setInput("");
    setPending(true);

    // Add a timeout (30s) so it never hangs forever
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000);

    try {
      const res = await fetch(`${API_BASE}/api/gemini`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: userMessage.text }),
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      if (!res.ok) {
        // Try to read server error if provided
        let errMsg = "Server error";
        try {
          const errData = await res.json();
          if (errData?.reply) errMsg = errData.reply;
        } catch {}
        throw new Error(errMsg);
      }

      const data = await res.json();
      const botReply = data?.reply || "⚠️ No reply from server.";

      setMessages((prev) =>
        prev.filter((m) => !m.loading).concat({ text: botReply, sender: "bot" })
      );
    } catch (err) {
      clearTimeout(timeoutId);
      console.error("Frontend error:", err);
      const msg =
        err.name === "AbortError"
          ? "⚠️ Request timed out. Try again."
          : "⚠️ Could not connect to AI. Try again.";
      setMessages((prev) =>
        prev.filter((m) => !m.loading).concat({ text: msg, sender: "bot" })
      );
    } finally {
      setPending(false);
    }
  };

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  return (
    <div className="chat-container">
      <div className="chat-box">
        {messages.map((msg, idx) => (
          <div key={idx} className={`message ${msg.sender}-message`}>
            {msg.text}
          </div>
        ))}
        <div ref={chatEndRef} />
      </div>

      <div className="chat-input">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              sendMessage();
            }
          }}
          placeholder="Type a message..."
          disabled={pending}
        />
        <button onClick={sendMessage} disabled={pending || !input.trim()}>
          {pending ? "Sending..." : "Send"}
        </button>
      </div>
    </div>
  );
}
