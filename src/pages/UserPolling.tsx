import { useState, useEffect } from 'react';
import { supabase } from '../../supabaseClient';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '../components/ui/chart';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Alert, AlertDescription } from '../components/ui/alert';
import { RadioGroup, RadioGroupItem } from '../components/ui/radio-group';
import { Label } from '../components/ui/label';
import { Separator } from '../components/ui/separator';
import { Progress } from '../components/ui/progress';
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts';
import { Bot, Vote, Check, Loader2, Calendar, Users, TrendingUp } from "lucide-react";
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

// Vibrant color palette for charts
const CHART_COLORS = [
  '#3b82f6',
  '#10b981',
  '#f59e0b',
  '#ef4444',
];

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

      const transformedPolls: Poll[] = await Promise.all(
        (pollsData || []).map(async (poll) => {
          const { data: responses } = await supabase
            .from('responses')
            .select('selected_option, user_id')
            .eq('poll_id', poll.id);

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
        <div className="flex flex-col items-center justify-center min-h-[400px] space-y-4">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-lg text-muted-foreground">Loading polls...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto p-6">
        <Alert variant="destructive" className="max-w-2xl mx-auto">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-muted/20 to-background">
      <div className="container max-w-7xl mx-auto px-4 py-8">
        {/* Hero Section */}
        <div className="text-center mb-8 space-y-4">
          <div className="flex justify-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary shadow-lg">
              <Vote className="h-8 w-8 text-primary-foreground" strokeWidth={2.5} />
            </div>
          </div>
          <div className="space-y-2">
            <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">Active Polls</h1>
            <CardDescription className="text-base max-w-2xl mx-auto">
              Discover and participate in polls that matter to your community. Your voice counts!
            </CardDescription>
          </div>
        </div>
        {polls.length === 0 ? (
          <Card className="max-w-2xl mx-auto text-center py-12 border-muted">
            <CardContent className="space-y-4">
              <div className="flex justify-center">
                <div className="h-16 w-16 rounded-full bg-muted flex items-center justify-center">
                  <Vote className="h-8 w-8 text-muted-foreground" />
                </div>
              </div>
              <div className="space-y-2">
                <h3 className="text-xl font-semibold">No Active Polls</h3>
                <p className="text-muted-foreground">There are no polls available for voting at the moment.</p>
                <p className="text-sm text-muted-foreground">Check back later or ask an admin to create some polls!</p>
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {polls.map((poll) => (
              <Card key={poll.id} className="border-muted hover:shadow-lg transition-shadow">
                <CardHeader className="space-y-3">
                  <div className="space-y-2">
                    <CardTitle className="text-xl leading-tight">{poll.question}</CardTitle>
                    {poll.description && (
                      <CardDescription>{poll.description}</CardDescription>
                    )}
                  </div>
                  {poll.image_url && (
                    <div className="rounded-lg overflow-hidden border bg-muted">
                      <img
                        src={poll.image_url}
                        alt="Poll"
                        className="w-full max-h-48 object-cover"
                      />
                    </div>
                  )}
                  <div className="flex items-center gap-2 text-xs text-muted-foreground pt-2">
                    <Badge variant="secondary" className="gap-1">
                      <Users className="h-3 w-3" />
                      {poll.total_votes} votes
                    </Badge>
                    <span>•</span>
                    <div className="flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      {new Date(poll.created_at).toLocaleDateString()}
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* Voting Interface */}
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <h4 className="font-semibold">Cast Your Vote</h4>
                      {votedPolls[poll.id] && (
                        <Badge variant="default" className="gap-1">
                          <Check className="h-3 w-3" />
                          Voted
                        </Badge>
                      )}
                    </div>
                    <style>
                      {`
                        [data-poll-id="${poll.id}"] button[data-state="checked"] {
                          background-color: hsl(var(--foreground));
                          border-color: hsl(var(--foreground));
                        }
                        [data-poll-id="${poll.id}"] button[data-state="checked"] span {
                          background-color: hsl(var(--background));
                        }
                      `}
                    </style>
                    <RadioGroup
                      value={selectedOptions[poll.id] || ''}
                      onValueChange={(value) => handleOptionSelect(poll.id, value)}
                      disabled={votedPolls[poll.id]}
                      className="space-y-3"
                      data-poll-id={poll.id}
                    >
                      {poll.options.map((option) => (
                        <div
                          key={option.id}
                          className={`flex items-center space-x-3 p-3 rounded-lg border-2 transition-all ${
                            selectedOptions[poll.id] === option.id
                              ? 'border-foreground bg-muted/50'
                              : 'border-border hover:border-muted-foreground/50'
                          } ${votedPolls[poll.id] ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer'}`}
                          onClick={() => !votedPolls[poll.id] && handleOptionSelect(poll.id, option.id)}
                        >
                          <RadioGroupItem
                            value={option.id}
                            id={`${poll.id}-${option.id}`}
                            disabled={votedPolls[poll.id]}
                            className="shrink-0"
                          />
                          <Label
                            htmlFor={`${poll.id}-${option.id}`}
                            className="flex-1 cursor-pointer text-sm font-medium text-foreground"
                          >
                            {option.text}
                          </Label>
                        </div>
                      ))}
                    </RadioGroup>
                    <div className="flex gap-2">
                      <Button
                        onClick={() => handleVote(poll.id)}
                        disabled={!selectedOptions[poll.id] || voting[poll.id] || votedPolls[poll.id]}
                        className="flex-1 gap-2"
                      >
                        {voting[poll.id] ? (
                          <>
                            <Loader2 className="h-4 w-4 animate-spin" />
                            Submitting...
                          </>
                        ) : votedPolls[poll.id] ? (
                          <>
                            <Check className="h-4 w-4" />
                            Voted
                          </>
                        ) : (
                          <>
                            <Vote className="h-4 w-4" />
                            Submit Vote
                          </>
                        )}
                      </Button>
                      <Button
                        onClick={handleChatBotClick}
                        variant="outline"
                        size="icon"
                        className="shrink-0"
                      >
                        <Bot className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                  {/* Results Section */}
                  {poll.total_votes > 0 && (
                    <>
                      <Separator />
                      <div className="space-y-4">
                        <h4 className="font-semibold flex items-center gap-2">
                          <TrendingUp className="h-4 w-4 text-primary" />
                          Live Results
                        </h4>
                        {/* Pie Chart */}
                        <div className="h-64">
                          <ChartContainer config={chartConfig}>
                            <PieChart>
                              <Pie
                                data={poll.options}
                                cx="50%"
                                cy="50%"
                                labelLine={false}
                                label={({ text, percent }) => `${text} ${(percent * 100).toFixed(0)}%`}
                                outerRadius={80}
                                dataKey="votes"
                              >
                                {poll.options.map((_entry, index) => (
                                  <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                                ))}
                              </Pie>
                              <ChartTooltip content={<ChartTooltipContent />} />
                            </PieChart>
                          </ChartContainer>
                        </div>
                        {/* Bar Chart */}
                        <div className="h-48">
                          <ChartContainer config={chartConfig}>
                            <BarChart data={poll.options}>
                              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                              <XAxis
                                dataKey="text"
                                angle={-45}
                                textAnchor="end"
                                height={80}
                                fontSize={12}
                                className="text-muted-foreground"
                              />
                              <YAxis className="text-muted-foreground" />
                              <ChartTooltip content={<ChartTooltipContent />} />
                              <Bar dataKey="votes" radius={[8, 8, 0, 0]}>
                                {poll.options.map((_entry, index) => (
                                  <Cell key={`bar-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                                ))}
                              </Bar>
                            </BarChart>
                          </ChartContainer>
                        </div>
                        {/* Detailed Results */}
                        <div className="space-y-3">
                          <h5 className="font-semibold text-sm">Vote Breakdown</h5>
                          <div className="space-y-2">
                            {poll.options.map((option, index) => {
                              const percentage = poll.total_votes > 0 ? (option.votes / poll.total_votes) * 100 : 0;
                              return (
                                <div key={option.id} className="space-y-1">
                                  <div className="flex items-center justify-between text-sm">
                                    <div className="flex items-center gap-2">
                                      <div
                                        className="w-3 h-3 rounded-full"
                                        style={{ backgroundColor: CHART_COLORS[index % CHART_COLORS.length] }}
                                      />
                                      <span className="font-medium text-foreground">{option.text}</span>
                                    </div>
                                    <span className="text-muted-foreground">
                                      {option.votes} ({percentage.toFixed(1)}%)
                                    </span>
                                  </div>
                                  <Progress value={percentage} className="h-2" />
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      </div>
                    </>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
        {/* Floating AI Assistant Button */}
        <div className="fixed bottom-6 right-6 z-50">
          <Button
            size="lg"
            className="h-16 w-16 rounded-full shadow-2xl hover:scale-110 transition-transform"
            onClick={handleChatBotClick}
          >
            <Bot className="h-7 w-7" strokeWidth={2.5} />
            <span className="sr-only">Open AI Assistant</span>
          </Button>
        </div>
      </div>
    </div>
  );
};

export default UserPolling;
