import { useState, useEffect } from "react";
import { supabase } from "../../supabaseClient";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid } from "recharts";

interface PollOption {
  id: string;
  text: string;
  votes: number;
}

interface Poll {
  id: string;
  question: string;
  description: string;
  options: PollOption[];
  total_votes: number;
  image_url: string | null;
  created_at: string;
  is_active: boolean | null;
}

const COLORS = ["#8884d8", "#82ca9d", "#ffc658", "#ff7f50"];
const chartConfig = {}; // optional chart config

const PollResult = () => {
  const [polls, setPolls] = useState<Poll[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchPolls();
  }, []);

  const fetchPolls = async () => {
    try {
      setLoading(true);
      setError(null);

      const { data: pollData, error: pollsError } = await supabase
        .from("polls")
        .select(
          `
          id,
          question,
          description,
          option1,
          option2,
          option3,
          option4,
          image_url,
          created_at,
          is_active
        `
        )
        .eq("is_active", true)
        .order("created_at", { ascending: false });

      if (pollsError) throw pollsError;

      // Transform each poll and fetch its responses
      const transformPolls: Poll[] = await Promise.all(
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
              voteCount[response.selected_option as OptionKey]
            ) {
              voteCount[response.selected_option as OptionKey] += 1;
            } else if (response.selected_option) {
              voteCount[response.selected_option as OptionKey] = 1;
            }
          });

          // Build poll options array
          const options: PollOption[] = [
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
            created_at: poll.created_at,
            is_active: poll.is_active,
          };
        })
      );

      setPolls(transformPolls);
    } catch (err) {
      console.error("Error fetching polls:", err);
      setError("Failed to fetch polls. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="text-center py-12 text-lg text-muted-foreground">
        Loading poll results...
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-12 text-lg text-red-500">
        {error} <br />
        <button onClick={fetchPolls} className="mt-4 px-4 py-2 bg-blue-600 text-white rounded">
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6">
      <div className="mb-8">
        <h1 className="text-4xl font-bold text-center mb-2">Poll Results</h1>
        <p className="text-center text-muted-foreground">
          View real-time results from all active polls
        </p>
      </div>

      {polls.length === 0 ? (
        <Card className="text-center py-12">
          <CardContent>
            <p className="text-lg text-muted-foreground">
              No poll results available at the moment.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {polls.map((poll) => (
            <Card key={poll.id} className="w-full">
              <CardHeader>
                <CardTitle className="text-xl">{poll.question}</CardTitle>
                <CardDescription>{poll.description}</CardDescription>
                {poll.image_url && (
                  <img
                    src={poll.image_url}
                    alt="Poll"
                    className="mt-2 max-w-full max-h-64 object-contain rounded"
                  />
                )}
                <div className="text-sm text-muted-foreground">
                  Total Votes: {poll.total_votes} • Created:{" "}
                  {new Date(poll.created_at).toLocaleDateString()}
                </div>
              </CardHeader>

              <CardContent className="space-y-6">
                {/* Options List */}
                <div className="space-y-3">
                  <h4 className="font-semibold text-lg">Options</h4>
                  <div className="space-y-2">
                    {poll.options.map((option) => (
                      <label
                        key={option.id}
                        className="flex items-center space-x-3"
                      >
                        <span className="text-sm">{option.text}</span>
                      </label>
                    ))}
                  </div>
                </div>

                {/* Pie Chart */}
                <div className="h-64 w-full mb-6 overflow-hidden rounded-lg bg-muted/20 p-4">
                  <ChartContainer config={chartConfig}>
                    <PieChart>
                      <Pie
                        data={poll.options}
                        cx="50%"
                        cy="50%"
                        outerRadius={80}
                        dataKey="votes"
                        label={({ text, percent }) =>
                          `${text} ${(percent * 100).toFixed(0)}%`
                        }
                      >
                        {poll.options.map((entry, index) => (
                          <Cell
                            key={`cell-${index}`}
                            fill={COLORS[index % COLORS.length]}
                          />
                        ))}
                      </Pie>
                      <ChartTooltip content={<ChartTooltipContent />} />
                    </PieChart>
                  </ChartContainer>
                </div>

                {/* Bar Chart */}
                <div className="h-72 w-full mb-6 overflow-hidden rounded-lg bg-muted/20 p-4">
                  <ChartContainer config={chartConfig}>
                    <BarChart data={poll.options}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis
                        dataKey="text"
                        angle={-45}
                        textAnchor="end"
                        height={80}
                        fontSize={12}
                      />
                      <YAxis />
                      <ChartTooltip content={<ChartTooltipContent />} />
                      <Bar dataKey="votes" fill="#8884d8" />
                    </BarChart>
                  </ChartContainer>
                </div>

                {/* Detailed Breakdown */}
                <div className="space-y-2">
                  <h5 className="font-semibold text-base">Vote Breakdown:</h5>
                  {poll.options.map((option, index) => {
                    const percentage =
                      poll.total_votes > 0
                        ? (option.votes / poll.total_votes) * 100
                        : 0;
                    return (
                      <div
                        key={option.id}
                        className="flex items-center justify-between"
                      >
                        <div className="flex items-center space-x-2">
                          <div
                            className="w-3 h-3 rounded-full"
                            style={{
                              backgroundColor: COLORS[index % COLORS.length],
                            }}
                          />
                          <span className="text-sm">{option.text}</span>
                        </div>
                        <div className="text-sm font-medium">
                          {option.votes} votes ({percentage.toFixed(1)}%)
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default PollResult;
