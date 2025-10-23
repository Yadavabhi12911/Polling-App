import { useEffect, useState } from "react";
import { main } from "@/utils/geminiModel";

const ChatBot = () => {
  const [response, setResponse] = useState <string | "">("");

  useEffect(() => {
    const fetchAIResponse = async () => {
      try {
        const text = await main("Explain how AI works in a few words");
        setResponse(text);
      } catch (err) {
        console.error("Error fetching AI response:", err);
      }
    };

    fetchAIResponse();
  }, []);

  return (
    <div className="text-center mt-20">
      <h1 className="text-4xl text-blue-600 mb-4">Chat Bot</h1>
      <p className="text-lg">{response || "Loading..."}</p>
    </div>
  );
};

export default ChatBot;
