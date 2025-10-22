import { supabase } from "../../supabaseClient"

import { GoogleGenAI, Type } from "@google/genai";


const apiKey = import.meta.env.VITE_GEMINI_API_KEY

const ai = new GoogleGenAI({ apiKey });

// fn declarations
const createPollFunctionDecleration = {
  name: "createPoll",
  description: "create a poll with given question and  options",

  parameters: {
    type: Type.OBJECT,
    properties: {
      question: {
        type: Type.STRING,
        description: "question to create a poll ",
      },

      option1: {
        type: Type.STRING,
        description: "First poll option"
      },
      option2: {
        type: Type.STRING,
        description: "Second poll option"
      },
      option3: {
        type: Type.STRING,
        description: "Third poll option"
      },
      option4: {
        type: Type.STRING,
        description: "Fourth poll option"
      },
      file_url: { type: Type.STRING, description: "Uploaded file/image URL (optional)" },
      file_type: { type: Type.STRING, description: "Type: pdf, docx, image (optional)" }

    },
    required: ["question", "option1", "option2", "option3", "option4"]

  },
}

const updatePollFunctionDeclaration = {
  name: "updatePoll",
  description: "update an existing poll's fields (question/options/is_active)",
  parameters: {
    type: Type.OBJECT,
    properties: {
      poll_id: { type: Type.STRING, description: "ID of the poll to update (preferred)" },
      question_match: { type: Type.STRING, description: "Poll question text to find the poll when id not provided" },
      question: { type: Type.STRING, description: "New question text (optional)" },
      option1: { type: Type.STRING, description: "Updated option 1 (optional)" },
      option2: { type: Type.STRING, description: "Updated option 2 (optional)" },
      option3: { type: Type.STRING, description: "Updated option 3 (optional)" },
      option4: { type: Type.STRING, description: "Updated option 4 (optional)" },
      is_active: { type: Type.BOOLEAN, description: "Set to false to close poll (optional)" },
    },
    required: [],
  },
};



const getPollResultFunctionDeclaration = {
  name: "getPollResult",
  description: "get poll results for all active polls",

  parameters: {
    type: Type.OBJECT,
    properties: {}, 
    required: []
  },
}

// chat history
let chatHistory: any[] = [
  {
    role: "model",
    parts: [
      {
        text: `You are a helpful poll creation assistant.
Guide the user step-by-step to create a poll.
Ask one question at a time in this order:
1. Poll question
2. Option 1
3. Option 2
4. Option 3
5. Option 4
After collecting all, call the "createPoll" function with all data.
Do not call the function early.

You can also help users:
- View poll results: call "getPollResult" when they ask for results/statistics.
- Update a poll (question/options/close): call "updatePoll". Prefer using an explicit poll ID; otherwise use an exact question match. If ambiguous, ask a clarifying question.
- Delete/close a poll: call "deletePoll" (this should set is_active=false). Prefer using an explicit poll ID; otherwise use an exact question match. If ambiguous, ask a clarifying question.`,
      },
    ],
  },
];

// Function to reset chat history
export function resetChat() {
  chatHistory = [
    {
      role: "model",
      parts: [
        {
          text: `You are a helpful poll creation assistant.
Guide the user step-by-step to create a poll.
Ask one question at a time in this order:
1. Poll question
2. Option 1
3. Option 2
4. Option 3
5. Option 4
After collecting all, call the "createPoll" function with all data.
Do not call the function early.

You can also help users view poll results by calling the "getPollResult" function when they ask about poll results, statistics, or want to see how polls are performing.`,
        },
      ],
    },
  ];
}


// decide which tool used and provide a res
export async function chatWithPollBot(userMessage: string, fileInfo?: {
  file_url?: string,
  file_type?: string,
  description?: string,
}) {

  // user msg to chat history 
  chatHistory.push({ role: "user", parts: [{ text: userMessage }] });


  // Ask Gemini for the next message
  const response = await ai.models.generateContent({
    model: "gemini-2.5-flash",
    contents: chatHistory,
    config: {
      tools: [
        {
          functionDeclarations: [
            createPollFunctionDecleration,
            getPollResultFunctionDeclaration,
            updatePollFunctionDeclaration,
           
          ]
        }
      ]
    }
  });


  if (response === null) {
    console.log("bot not responding, try again");

  }
  else {

    const modelText = response.candidates?.[0]?.content?.parts?.[0]?.text || "I didn't get that.";


    // add model chat history 
    chatHistory.push({ role: "model", parts: [{ text: modelText }] });
  }

  // checking whether  the model responded with a fn call
  if (response.functionCalls && response.functionCalls.length > 0) {

    const functionCall = response.functionCalls[0];
    const functionName = functionCall.name;
    const args = functionCall.args;

    if (functionName === "createPoll") {
      if (!args) {
        console.log('No poll data found');
        return { type: "text", message: "Failed to create poll. Please try again." };
      }

      // insertData
      const insertData = {
        question: args.question,
        option1: args.option1,
        option2: args.option2,
        option3: args.option3,
        option4: args.option4,
        description: fileInfo?.description ?? null,
        image_url: (fileInfo?.file_type === "image") ? fileInfo?.file_url : null,
        file_url: (fileInfo?.file_type === "pdf" || fileInfo?.file_type === "doc") ? fileInfo?.file_url : null,
        file_type: fileInfo?.file_type ?? null,
        is_active: true,
        created_at: new Date().toISOString()
      };

      // Insert poll into database
      try {
        const { data: pollData, error: pollError } = await supabase
          .from("polls")
          .insert(insertData)
          .select("*")
          .single();

        if (pollError) {
          console.error("Error creating poll:", pollError);
          return { type: "text", message: "Failed to create poll. Please try again." };
        }

        console.log("Poll created successfully:", pollData);
        return { type: "poll", data: pollData };

      } catch (error) {
        console.error("Database error:", error);
        return { type: "text", message: "Failed to create poll. Please try again." };
      }
    } else if (functionName === "getPollResult") {
      try {
        // Fetch all active polls with their responses
        const { data: pollData, error: pollsError } = await supabase
          .from("polls")
          .select(`
            id,
            question,
            description,
            option1,
            option2,
            option3,
            option4,
            image_url,
            file_url,
            file_type,
            created_at,
            is_active
          `)
          .eq("is_active", true)
          .order("created_at", { ascending: false });

        if (pollsError) throw pollsError;  

        // Transform each poll and fetch its responses
        const pollsWithResults = await Promise.all(
          (pollData || []).map(async (poll: any) => {
            const { data: responses } = await supabase
              .from("responses")
              .select("selected_option, user_id")
              .eq("poll_id", poll.id);

            // Initialize vote counters
            const voteCount = { "1": 0, "2": 0, "3": 0, "4": 0 };
            type OptionKey = "1" | "2" | "3" | "4";

            responses?.forEach((response) => {
              if (
                response.selected_option &&
                voteCount[response.selected_option as OptionKey] !== undefined
              ) {
                voteCount[response.selected_option as OptionKey] += 1;
              }
            });

            // Build poll options array
            const options = [
              { id: "1", text: poll.option1, votes: voteCount["1"] || 0 },
              { id: "2", text: poll.option2, votes: voteCount["2"] || 0 },
              { id: "3", text: poll.option3, votes: voteCount["3"] || 0 },
              { id: "4", text: poll.option4, votes: voteCount["4"] || 0 },
            ].filter((option) => option.text);

            const totalVotes = options.reduce(
              (acc, option) => acc + option.votes,
              0
            );

            return {
              id: poll.id,
              question: poll.question,
              description: poll.description,
              options,
              total_votes: totalVotes,
              image_url: poll.image_url,
              file_url: poll.file_url,
              file_type: poll.file_type,
              created_at: poll.created_at,
              is_active: poll.is_active,
            };
          })
        );

        return { type: "pollResults", data: pollsWithResults };

      } catch (error) {
        console.error("Error fetching poll results:", error);
        return { type: "text", message: "Failed to fetch poll results. Please try again." };
      }
    } else if (functionName === "updatePoll") {
      try {
        // Find target poll
        let targetId = args?.poll_id as string | undefined;
        if (!targetId && args?.question_match) {
          const { data: candidates, error } = await supabase
            .from("polls")
            .select("id, question, created_at")
            .ilike("question", args.question_match);
          if (error) throw error;
          if (!candidates || candidates.length === 0) {
            return { type: "text", message: "No poll found matching that question." };
          }
          if (candidates.length > 1) {
            return { type: "text", message: "Multiple polls match. Please specify the poll ID." };
          }
          targetId = candidates[0].id;
        }

        if (!targetId) {
          return { type: "text", message: "Please provide a poll ID or exact question to update." };
        }

        const updateData: Record<string, any> = {};
        ["question", "option1", "option2", "option3", "option4", "is_active"].forEach((key) => {
          if (args && args[key] !== undefined) updateData[key] = args[key];
        });

        if (Object.keys(updateData).length === 0) {
          return { type: "text", message: "No fields to update were provided." };
        }

        const { data, error } = await supabase
          .from("polls")
          .update(updateData)
          .eq("id", targetId)
          .select("*")
          .single();
        if (error) throw error;
        return { type: "text", message: `Poll updated successfully (id: ${data.id}).` };
      } catch (error) {
        console.error("Error updating poll:", error);
        return { type: "text", message: "Failed to update poll. Please try again." };
      }
    } 

    return { type: "text", message: "Unknown function call." };
  } else {

    return { type: "text", message: response.candidates?.[0]?.content?.parts?.[0]?.text };
  }
}








