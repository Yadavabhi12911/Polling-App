
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

const deletePollFunctionDeclaration = {
  name: "deletePoll",
  description: "soft-delete a poll by setting is_active to false",
  parameters: {
    type: Type.OBJECT,
    properties: {
      poll_id: { type: Type.STRING, description: "ID of the poll to delete (preferred)" },
      question_match: { type: Type.STRING, description: "Poll question text to find the poll when id not provided" },
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

const getSpecificPollResultFunctionDeclaration = {
  name: "getSpecificPollResult",
  description: "get poll results for a specific poll by ID or question",

  parameters: {
    type: Type.OBJECT,
    properties: {
      poll_id: {
        type: Type.STRING,
        description: "ID of the specific poll to get results for (preferred)"
      },
      poll_question: {
        type: Type.STRING,
        description: "Question text of the poll to get results for (alternative to poll_id)"
      }
    },
    required: []
  },
}

const votePollFunctionDeclaration = {
  name: "votePoll",
  description: "vote on an active poll by selecting an option",
  parameters: {
    type: Type.OBJECT,
    properties: {
      poll_id: {
        type: Type.STRING,
        description: "ID of the poll to vote on (preferred)"
      },
      poll_question: {
        type: Type.STRING,
        description: "Question text of the poll to vote on (alternative to poll_id)"
      },
      selected_option: {
        type: Type.STRING,
        description: "The option to vote for (1, 2, 3, or 4)"
      }
    },
    required: ["selected_option"]
  },
}

// chat history
let chatHistory: any[] = [
  {
    role: "model",
    parts: [
      {
        text: `You are a helpful poll assistant that can help users with polls in different ways based on their role:

For ADMIN users:
- Create polls: Guide step-by-step to create a poll (question, 4 options)
- View poll results: call "getPollResult" when they ask for results/statistics
- View specific poll results: call "getSpecificPollResult" with poll_id OR poll_question to get results for a specific poll
- Update polls: call "updatePoll" to modify existing polls
- Delete/close polls: call "deletePoll" to close polls
- Vote on polls: call "votePoll" with either poll_id OR poll_question and selected_option (1, 2, 3, or 4)

For REGULAR users:
- View active polls: call "getPollResult" to see all active polls
- View specific poll results: call "getSpecificPollResult" with poll_id OR poll_question to get results for a specific poll
- Vote on polls: call "votePoll" with either poll_id OR poll_question and selected_option (1, 2, 3, or 4)
- Ask questions about polls and get help with voting
- CANNOT create, update, or delete polls (admin only) - will receive "not authorized" message

Always be helpful and guide users through the process step by step. If a regular user tries to create/update/delete polls, politely explain they don't have permission and suggest they contact an admin.

IMPORTANT: If a regular user (non-admin) asks to create, update, or delete a poll, immediately respond with an authorization message instead of asking follow-up questions. Do not proceed with the poll creation/update/delete process for non-admin users.

RESPONSE FORMATTING GUIDELINES:
- Keep responses concise and well-structured
- Use bullet points and emojis for better readability
- Highlight key information (leading options, vote counts)
- Provide clear, actionable instructions
- Avoid repetitive text and unnecessary details`,
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
          text: `You are a helpful poll assistant that can help users with polls in different ways based on their role:

For ADMIN users:
- Create polls: Guide step-by-step to create a poll (question, 4 options)
- View poll results: call "getPollResult" when they ask for results/statistics
- View specific poll results: call "getSpecificPollResult" with poll_id OR poll_question to get results for a specific poll
- Update polls: call "updatePoll" to modify existing polls
- Delete/close polls: call "deletePoll" to close polls
- Vote on polls: call "votePoll" with either poll_id OR poll_question and selected_option (1, 2, 3, or 4)

For REGULAR users:
- View active polls: call "getPollResult" to see all active polls
- View specific poll results: call "getSpecificPollResult" with poll_id OR poll_question to get results for a specific poll
- Vote on polls: call "votePoll" with either poll_id OR poll_question and selected_option (1, 2, 3, or 4)
- Ask questions about polls and get help with voting
- CANNOT create, update, or delete polls (admin only) - will receive "not authorized" message

Always be helpful and guide users through the process step by step. If a regular user tries to create/update/delete polls, politely explain they don't have permission and suggest they contact an admin.

IMPORTANT: If a regular user (non-admin) asks to create, update, or delete a poll, immediately respond with an authorization message instead of asking follow-up questions. Do not proceed with the poll creation/update/delete process for non-admin users.

RESPONSE FORMATTING GUIDELINES:
- Keep responses concise and well-structured
- Use bullet points and emojis for better readability
- Highlight key information (leading options, vote counts)
- Provide clear, actionable instructions
- Avoid repetitive text and unnecessary details`,
        },
      ],
    },
  ];
}


// decide which tool used and provide a res
export async function chatWithPollBot(userMessage: string, userRole: string | null, fileInfo?: {
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
            getSpecificPollResultFunctionDeclaration,
            updatePollFunctionDeclaration,
            deletePollFunctionDeclaration,
            votePollFunctionDeclaration,
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
      if (userRole !== "admin") {
        return { type: "text", message: "❌ You are not authorized to create polls." };
      }
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
        console.error(" user not authorised! :", error);
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
    } else if (functionName === "getSpecificPollResult") {
      try {
        const pollId = args?.poll_id as string;
        const pollQuestion = args?.poll_question as string;

        if (!pollId && !pollQuestion) {
          return { type: "text", message: "Please provide either poll ID or poll question to get specific poll results." };
        }

        let targetPollId = pollId;

        // If poll_id not provided, find poll by question
        if (!targetPollId && pollQuestion) {
          const { data: polls, error: pollSearchError } = await supabase
            .from("polls")
            .select("id, question, is_active")
            .eq("is_active", true)
            .ilike("question", `%${pollQuestion}%`);

          if (pollSearchError) throw pollSearchError;

          if (!polls || polls.length === 0) {
            return { type: "text", message: `No active poll found matching "${pollQuestion}". Please check the question text or use the poll ID.` };
          }

          if (polls.length > 1) {
            const pollList = polls.map(p => `• "${p.question}" (ID: ${p.id})`).join('\n');
            return { type: "text", message: `Multiple polls match "${pollQuestion}". Please be more specific or use the poll ID:\n\n${pollList}` };
          }

          targetPollId = polls[0].id;
        }

        // Fetch the specific poll with its responses
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
          .eq("id", targetPollId)
          .single();

        if (pollsError || !pollData) {
          return { type: "text", message: "Poll not found." };
        }

        if (!pollData.is_active) {
          return { type: "text", message: "This poll is no longer active." };
        }

        // Fetch responses for this poll
        const { data: responses } = await supabase
          .from("responses")
          .select("selected_option, user_id")
          .eq("poll_id", pollData.id);

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
          { id: "1", text: pollData.option1, votes: voteCount["1"] || 0 },
          { id: "2", text: pollData.option2, votes: voteCount["2"] || 0 },
          { id: "3", text: pollData.option3, votes: voteCount["3"] || 0 },
          { id: "4", text: pollData.option4, votes: voteCount["4"] || 0 },
        ].filter((option) => option.text);

        const totalVotes = options.reduce(
          (acc, option) => acc + option.votes,
          0
        );

        const pollWithResults = {
          id: pollData.id,
          question: pollData.question,
          description: pollData.description,
          options,
          total_votes: totalVotes,
          image_url: pollData.image_url,
          file_url: pollData.file_url,
          file_type: pollData.file_type,
          created_at: pollData.created_at,
          is_active: pollData.is_active,
        };

        return { type: "pollResults", data: [pollWithResults] };

      } catch (error) {
        console.error("Error fetching specific poll results:", error);
        return { type: "text", message: "Failed to fetch poll results. Please try again." };
      }
    } else if (functionName === "updatePoll") {
      if (userRole !== "admin") {
        return { type: "text", message: "❌ You are not authorized to update polls." };
      }
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
        console.error(" user not authorised! :", error);
        return { type: "text", message: "Failed to update poll. Please try again." };
      }
    } else if (functionName === "deletePoll") {
      if (userRole !== "admin") {
        return { type: "text", message: "❌ You are not authorized to delete polls. "};
      }
      try {
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
          return { type: "text", message: "Please provide a poll ID or exact question to delete." };
        }

        const { data, error } = await supabase
          .from("polls")
          .update({ is_active: false })
          .eq("id", targetId)
          .select("id")
          .single();
        if (error) throw error;
        return { type: "text", message: `Poll closed successfully (id: ${data.id}).` };
      } catch (error) {
        console.error(" user not authorised! :", error);
        return { type: "text", message: "Failed to delete poll. Please try again." };
      }
    } else if (functionName === "votePoll") {
      try {
        // Get current user
        const { data: { user }, error: userError } = await supabase.auth.getUser();
        if (userError || !user) {
          return { type: "text", message: "You must be logged in to vote." };
        }

        const pollId = args?.poll_id as string;
        const pollQuestion = args?.poll_question as string;
        const selectedOption = args?.selected_option as string;

        if (!selectedOption) {
          return { type: "text", message: "Please provide the selected option (1, 2, 3, or 4)." };
        }

        if (!pollId && !pollQuestion) {
          return { type: "text", message: "Please provide either poll ID or poll question." };
        }

        // Validate option (should be 1, 2, 3, or 4)
        if (!["1", "2", "3", "4"].includes(selectedOption)) {
          return { type: "text", message: "Selected option must be 1, 2, 3, or 4." };
        }

        let targetPollId = pollId;

        // If poll_id not provided, find poll by question
        if (!targetPollId && pollQuestion) {
          const { data: polls, error: pollSearchError } = await supabase
            .from("polls")
            .select("id, question, is_active")
            .eq("is_active", true)
            .ilike("question", `%${pollQuestion}%`);

          if (pollSearchError) throw pollSearchError;

          if (!polls || polls.length === 0) {
            return { type: "text", message: `No active poll found matching "${pollQuestion}". Please check the question text or use the poll ID.` };
          }

          if (polls.length > 1) {
            const pollList = polls.map(p => `• "${p.question}" (ID: ${p.id})`).join('\n');
            return { type: "text", message: `Multiple polls match "${pollQuestion}". Please be more specific or use the poll ID:\n\n${pollList}` };
          }

          targetPollId = polls[0].id;
        }

        // Check if poll exists and is active
        const { data: poll, error: pollError } = await supabase
          .from("polls")
          .select("id, question, is_active")
          .eq("id", targetPollId)
          .single();

        if (pollError || !poll) {
          return { type: "text", message: "Poll not found." };
        }

        if (!poll.is_active) {
          return { type: "text", message: "This poll is no longer active." };
        }

        // Check if user already voted on this poll
        const { data: existingVote, error: voteCheckError } = await supabase
          .from("responses")
          .select("id")
          .eq("poll_id", targetPollId)
          .eq("user_id", user.id)
          .single();

        if (voteCheckError && voteCheckError.code !== "PGRST116") { // PGRST116 is "not found" error
          throw voteCheckError;
        }

        if (existingVote) {
          return { type: "text", message: "You have already voted on this poll." };
        }

        // Insert the vote
        const { error: insertError } = await supabase
          .from("responses")
          .insert({
            poll_id: targetPollId,
            selected_option: selectedOption,
            user_id: user.id,
            created_at: new Date().toISOString(),
          });

        if (insertError) throw insertError;

        return { type: "text", message: `✅ Vote submitted successfully! You voted for option ${selectedOption} on poll: "${poll.question}"` };

      } catch (error) {
        console.error("Error voting on poll:", error);
        return { type: "text", message: "Failed to submit vote. Please try again." };
      }
    }

    return { type: "text", message: "Unknown function call." };
  } else {

    return { type: "text", message: response.candidates?.[0]?.content?.parts?.[0]?.text };
  }
}




