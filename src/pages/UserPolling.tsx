import { useState, useEffect } from 'react';
import { supabase } from '../../supabaseClient';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '../components/ui/chart';
import { Button } from '../components/ui/button';
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts';
import { MessageSquare, Bot, Vote } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface PollOption {
  id: string;
  text: string;
  votes: number;
}

interface Poll {
  id: string;
  question: string;
  description: string | null;
  options: PollOption[];
  total_votes: number;
  image_url: string | null;
  created_at: string;
  is_active: boolean | null;
}

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042'];

const UserPolling = () => {
  const [polls, setPolls] = useState<Poll[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedOptions, setSelectedOptions] = useState<{ [pollId: string]: string }>({});
  const [voting, setVoting] = useState<{ [pollId: string]: boolean }>({});
  const [votedPolls, setVotedPolls] = useState<{ [key: string]: boolean }>({});
  const [userId, setUserId] = useState<string | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    const setup = async () => {
      await fetchUserAndVotes();
    };
    setup();
  }, []);

  useEffect(() => {
    const fetchPollsData = async () => {
      await fetchPolls();
    };
    fetchPollsData();
  }, []);

  // Fetch current logged-in user ID and votes
  const fetchUserAndVotes = async () => {
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();
    
    if (userError) {
      setError("Failed to fetch user info");
      return;
    }
    
    if (!user) {
      setError("User not logged in");
      return;
    }
    
    setUserId(user.id);

    const { data: votes, error: votesError } = await supabase
      .from('responses')
      .select('poll_id')
      .eq('user_id', user.id);

    if (votesError) {
      setError("Failed to fetch user votes");
      return;
    }

    const votedMap: { [pollId: string]: boolean } = {};
    votes?.forEach((vote) => {
      if (vote.poll_id) votedMap[vote.poll_id] = true;
    });
    setVotedPolls(votedMap);
  };

  // Fetch polls and determine if user already voted
  const fetchPolls = async () => {
    try {
      setLoading(true);
      const { data: pollsData, error: pollsError } = await supabase
        .from('polls')
        .select(`
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
        `)
        .eq('is_active', true)
        .order('created_at', { ascending: false });

      if (pollsError) throw pollsError;

      // Transform polls and count votes
      const transformedPolls: Poll[] = await Promise.all(
        (pollsData || []).map(async (poll) => {
          const { data: responses } = await supabase
            .from('responses')
            .select('selected_option, user_id')
            .eq('poll_id', poll.id);

          // Count votes
          type OptionKey = '1' | '2' | '3' | '4';
          const voteCounts: Record<OptionKey, number> = { '1': 0, '2': 0, '3': 0, '4': 0 };
          
          responses?.forEach((response) => {
            if (response.selected_option in voteCounts) {
              voteCounts[response.selected_option as OptionKey]++;
            }
          });

          const options: PollOption[] = [
            { id: '1', text: poll.option1, votes: voteCounts['1'] },
            { id: '2', text: poll.option2, votes: voteCounts['2'] },
            { id: '3', text: poll.option3, votes: voteCounts['3'] },
            { id: '4', text: poll.option4, votes: voteCounts['4'] },
          ].filter((option) => option.text);

          const totalVotes = options.reduce((acc, option) => acc + option.votes, 0);

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

      setPolls(transformedPolls);
    } catch (err) {
      console.error('Error fetching polls:', err);
      setError('Failed to fetch polls. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleOptionSelect = (pollId: string, optionId: string) => {
    setSelectedOptions((prev) => ({
      ...prev,
      [pollId]: optionId,
    }));
  };

  const handleVote = async (pollId: string) => {
    if (votedPolls[pollId]) {
      alert("You have already voted in this poll");
      return;
    }

    const selectedOption = selectedOptions[pollId];
    if (!selectedOption || !userId) return;

    try {
      setVoting(prev => ({ ...prev, [pollId]: true }));

      const { error } = await supabase.from('responses').insert({
        poll_id: pollId,
        selected_option: selectedOption,
        user_id: userId,
        created_at: new Date().toISOString(),
      });

      if (error) throw error;

      setVotedPolls(prev => ({ ...prev, [pollId]: true }));
      await fetchPolls();

      setSelectedOptions(prev => {
        const copy = { ...prev };
        delete copy[pollId];
        return copy;
      });
    } catch (error) {
      setError('Failed to submit vote. Please try again.');
    } finally {
      setVoting(prev => ({ ...prev, [pollId]: false }));
    }
  };

  const handleChatBotClick = () => {
    navigate("/app/chat-bot");
  };

  const chartConfig = {
    votes: {
      label: 'Votes',
    },
  };

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-lg">Loading polls...</div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-lg text-red-600">{error}</div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6">
      <div className="mb-8">
        <h1 className="text-4xl font-bold text-center mb-2">Let's see which polls are open for voting!</h1>
        <p className="text-center text-muted-foreground">View and vote on active polls using our AI assistant</p>
      </div>

      {polls.length === 0 ? (
        <Card className="text-center py-12">
          <CardContent>
            <p className="text-lg text-muted-foreground">No active polls available at the moment.</p>
            <p className="text-sm text-muted-foreground mt-2">Check back later or ask an admin to create some polls!</p>
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
                  Total Votes: {poll.total_votes} • Created: {new Date(poll.created_at).toLocaleDateString()}
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  {/* Voting Interface */}
                  <div className="space-y-3">
                    <h4 className="font-semibold text-lg">Cast Your Vote</h4>
                    <div className="space-y-2">
                      {poll.options.map((option, index) => (
                        <label key={option.id} className="flex items-center space-x-3 cursor-pointer">
                          <input
                            type="radio"
                            name={`poll-${poll.id}`}
                            value={option.id}
                            checked={selectedOptions[poll.id] === option.id}
                            onChange={() => handleOptionSelect(poll.id, option.id)}
                            className="w-4 h-4 text-blue-600"
                            disabled={votedPolls[poll.id]}
                          />
                          <span className="text-sm">{option.text}</span>
                        </label>
                      ))}
                    </div>
                    <div className="flex gap-2">
                      <Button
                        onClick={() => handleVote(poll.id)}
                        disabled={!selectedOptions[poll.id] || voting[poll.id] || votedPolls[poll.id]}  
                        className="flex-1"
                      >
                        {votedPolls[poll.id] ? 'Already Voted' : voting[poll.id] ? 'Submitting...' : 'Submit Vote'}
                      </Button>
                      <Button
                        onClick={handleChatBotClick}
                        variant="outline"
                        className="flex-1"
                      >
                        <Bot className="h-4 w-4 mr-2" />
                        Vote with AI
                      </Button>
                    </div>
                  </div>

                  {/* Results Section */}
                  {poll.total_votes > 0 && (
                    <>
                      <div className="border-t pt-4">
                        <h4 className="font-semibold text-lg mb-4">Live Results:</h4>

                        {/* Pie Chart */}
                        <div className="h-64 mb-4">
                          <ChartContainer config={chartConfig}>
                            <PieChart>
                              <Pie
                                data={poll.options}
                                cx="50%"
                                cy="50%"
                                labelLine={false}
                                label={({ text, percent }) => `${text} ${(percent * 100).toFixed(0)}%`}
                                outerRadius={80}
                                fill="#8884d8"
                                dataKey="votes"
                              >
                                {poll.options.map((entry, index) => (
                                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                ))}
                              </Pie>
                              <ChartTooltip content={<ChartTooltipContent />} />
                            </PieChart>
                          </ChartContainer>
                        </div>

                        {/* Bar Chart */}
                        <div className="h-48 mb-4">
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

                        {/* Detailed Results */}
                        <div className="space-y-2">
                          <h5 className="font-semibold">Vote Breakdown:</h5>
                          {poll.options.map((option, index) => {
                            const percentage = poll.total_votes > 0 ? (option.votes / poll.total_votes) * 100 : 0;
                            return (
                              <div key={option.id} className="flex items-center justify-between">
                                <div className="flex items-center space-x-2">
                                  <div
                                    className="w-3 h-3 rounded-full"
                                    style={{ backgroundColor: COLORS[index % COLORS.length] }}
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
                      </div>
                    </>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Floating ChatBot Button */}
      <div className="fixed bottom-6 right-6">
        <Button
          variant="outline"
          size="icon"
          className="h-16 w-16 rounded-full shadow-xl hover:scale-105 transition-transform flex flex-col"
          onClick={handleChatBotClick}
        >
          <Bot className="h-8 w-8 text-primary" />
          <span className="text-xs mt-1">AI</span>
        </Button>
      </div>
    </div>
  );
};

export default UserPolling;
