'use client';

import { useState } from 'react';
import { InterviewQuestion, InterviewPreparationFeedback } from '@/types/ai.types';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
    ChevronDown, 
    ChevronRight,
    Lightbulb, 
    Target, 
    TrendingUp, 
    CheckCircle2, 
    AlertCircle,
    Sparkles,
    Star
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface InterviewQuestionsListProps {
    questions: InterviewQuestion[];
    feedback?: InterviewPreparationFeedback;
}

export default function InterviewQuestionsList({
    questions,
    feedback,
}: InterviewQuestionsListProps) {
    const [expandedQuestions, setExpandedQuestions] = useState<Set<number>>(
        new Set()
    );
    const [isFeedbackExpanded, setIsFeedbackExpanded] = useState(true);

    const toggleQuestion = (index: number) => {
        const newExpanded = new Set(expandedQuestions);
        if (newExpanded.has(index)) {
            newExpanded.delete(index);
        } else {
            newExpanded.add(index);
        }
        setExpandedQuestions(newExpanded);
    };

    const getCategoryVariant = (category: string) => {
        switch (category) {
            case 'behavioral':
                return 'default';
            case 'technical':
                return 'secondary';
            case 'situational':
                return 'outline';
            case 'experience-based':
                return 'destructive';
            default:
                return 'secondary';
        }
    };

    const getDifficultyColor = (difficulty: string) => {
        switch (difficulty) {
            case 'easy':
                return 'text-green-600 dark:text-green-400';
            case 'medium':
                return 'text-yellow-600 dark:text-yellow-400';
            case 'hard':
                return 'text-red-600 dark:text-red-400';
            default:
                return 'text-muted-foreground';
        }
    };

    const getMatchScoreColor = (score: number) => {
        if (score >= 80) return 'text-green-600 dark:text-green-400';
        if (score >= 60) return 'text-yellow-600 dark:text-yellow-400';
        return 'text-red-600 dark:text-red-400';
    };

    const getMatchScoreGradient = (score: number) => {
        if (score >= 80) return 'from-green-500 to-emerald-600';
        if (score >= 60) return 'from-yellow-500 to-amber-600';
        return 'from-red-500 to-rose-600';
    };

    return (
        <div className="flex gap-6">
            {/* Questions List - Left Side */}
            <div className="flex-1 space-y-4">
                <Card className="bg-muted/50 border-muted">
                    <CardContent className="p-4">
                        <h3 className="text-lg font-semibold text-foreground mb-2">
                            Generated Interview Questions
                        </h3>
                        <p className="text-sm text-muted-foreground">
                            Practice these {questions.length} questions to prepare for your interview.
                            Click on any question to see suggested answers and tips.
                        </p>
                    </CardContent>
                </Card>

                {questions.map((question, index) => (
                    <Card
                        key={index}
                        className={`transition-all duration-200 ${expandedQuestions.has(index) ? 'ring-1 ring-primary' : 'hover:border-primary/50'}`}
                    >
                        <div
                            className="p-4 cursor-pointer hover:bg-muted/30 transition-colors"
                            onClick={() => toggleQuestion(index)}
                        >
                            <div className="flex items-start justify-between">
                                <div className="flex-1">
                                    <div className="flex items-center gap-2 mb-2">
                                        <Badge variant={getCategoryVariant(question.category) as any}>
                                            {question.category}
                                        </Badge>
                                        <span
                                            className={`text-xs font-medium capitalize ${getDifficultyColor(
                                                question.difficulty
                                            )}`}
                                        >
                                            {question.difficulty}
                                        </span>
                                    </div>
                                    <p className="text-foreground font-medium">
                                        {index + 1}. {question.question}
                                    </p>
                                </div>
                                <ChevronDown
                                    className={`w-5 h-5 text-muted-foreground ml-2 transition-transform duration-200 ${expandedQuestions.has(index) ? 'transform rotate-180' : ''
                                        }`}
                                />
                            </div>
                        </div>

                        {expandedQuestions.has(index) && (
                            <div className="px-4 pb-4 border-t border-border/50 pt-4 bg-muted/10">
                                {/* Suggested Answer */}
                                {question.suggestedAnswer && (
                                    <div className="mb-4">
                                        <h4 className="text-sm font-semibold text-foreground mb-2">
                                            Suggested Answer:
                                        </h4>
                                        <p className="text-sm text-foreground/80 leading-relaxed">
                                            {question.suggestedAnswer}
                                        </p>
                                    </div>
                                )}

                                {/* Key Points */}
                                {question.keyPoints && question.keyPoints.length > 0 && (
                                    <div>
                                        <h4 className="text-sm font-semibold text-foreground mb-2">
                                            Key Points to Cover:
                                        </h4>
                                        <ul className="space-y-2">
                                            {question.keyPoints.map((point, idx) => (
                                                <li key={idx} className="flex items-start bg-background p-2 rounded-md border text-sm text-muted-foreground">
                                                    <div className="mr-2 mt-0.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
                                                    <span>{point}</span>
                                                </li>
                                            ))}
                                        </ul>
                                    </div>
                                )}
                            </div>
                        )}
                    </Card>
                ))}

                {/* Action Buttons */}
                <div className="flex gap-3">
                    <Button
                        onClick={() => {
                            const questionText = questions
                                .map((q, i) => `${i + 1}. ${q.question}`)
                                .join('\n\n');
                            navigator.clipboard.writeText(questionText);
                        }}
                        variant="outline"
                        className="flex-1"
                    >
                        Copy Questions
                    </Button>
                    <Button
                        onClick={() => {
                            const expandAll = expandedQuestions.size !== questions.length;
                            if (expandAll) {
                                setExpandedQuestions(new Set(questions.map((_, i) => i)));
                            } else {
                                setExpandedQuestions(new Set());
                            }
                        }}
                        variant="outline"
                        className="flex-1"
                    >
                        {expandedQuestions.size === questions.length
                            ? 'Collapse All'
                            : 'Expand All'}
                    </Button>
                </div>
            </div>

            {/* Personalized Feedback Card - Right Side */}
            {feedback && (
                <div className="w-80 lg:w-96 shrink-0">
                    <Card className={cn(
                        "sticky top-24 transition-all duration-300 overflow-hidden",
                        "bg-gradient-to-br from-white via-gray-50/50 to-gray-100/30",
                        "dark:from-gray-900 dark:via-gray-900/95 dark:to-gray-800/50",
                        "border-black/[0.08] dark:border-white/[0.08]",
                        "shadow-lg hover:shadow-xl"
                    )}>
                        {/* Header with Match Score */}
                        <CardHeader 
                            className={cn(
                                "pb-4 cursor-pointer select-none",
                                "bg-gradient-to-r from-brand-50 to-transparent dark:from-brand-950/30 dark:to-transparent"
                            )}
                            onClick={() => setIsFeedbackExpanded(!isFeedbackExpanded)}
                        >
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className={cn(
                                        "h-10 w-10 rounded-xl flex items-center justify-center",
                                        "bg-gradient-to-br",
                                        getMatchScoreGradient(feedback.matchScore)
                                    )}>
                                        <Target className="h-5 w-5 text-white" />
                                    </div>
                                    <div>
                                        <CardTitle className="text-sm font-bold uppercase tracking-widest text-muted-foreground">
                                            Your Feedback
                                        </CardTitle>
                                        <div className="flex items-center gap-2 mt-1">
                                            <span className={cn("text-2xl font-bold", getMatchScoreColor(feedback.matchScore))}>
                                                {feedback.matchScore}%
                                            </span>
                                            <span className="text-xs text-muted-foreground">Match</span>
                                        </div>
                                    </div>
                                </div>
                                <ChevronRight className={cn(
                                    "h-5 w-5 text-muted-foreground transition-transform duration-200",
                                    isFeedbackExpanded && "rotate-90"
                                )} />
                            </div>
                        </CardHeader>

                        {isFeedbackExpanded && (
                            <CardContent className="p-0 animate-in fade-in slide-in-from-top-2 duration-300">
                                <div className="max-h-[calc(100vh-280px)] overflow-y-auto custom-scrollbar">
                                    {/* Strengths Section */}
                                    {feedback.strengths.length > 0 && (
                                        <div className="p-4 border-t border-border/30">
                                            <div className="flex items-center gap-2 mb-3">
                                                <div className="h-6 w-6 rounded-lg bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                                                    <CheckCircle2 className="h-3.5 w-3.5 text-green-600 dark:text-green-400" />
                                                </div>
                                                <h4 className="text-xs font-bold text-foreground uppercase tracking-wider">
                                                    Your Strengths
                                                </h4>
                                            </div>
                                            <ul className="space-y-2">
                                                {feedback.strengths.map((strength, idx) => (
                                                    <li 
                                                        key={idx} 
                                                        className="flex items-start gap-2 text-sm text-foreground/80 leading-relaxed"
                                                    >
                                                        <span className="text-green-500 mt-1">•</span>
                                                        <span>{strength}</span>
                                                    </li>
                                                ))}
                                            </ul>
                                        </div>
                                    )}

                                    {/* Areas to Improve Section */}
                                    {feedback.areasToImprove.length > 0 && (
                                        <div className="p-4 border-t border-border/30">
                                            <div className="flex items-center gap-2 mb-3">
                                                <div className="h-6 w-6 rounded-lg bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
                                                    <TrendingUp className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400" />
                                                </div>
                                                <h4 className="text-xs font-bold text-foreground uppercase tracking-wider">
                                                    Areas to Improve
                                                </h4>
                                            </div>
                                            <ul className="space-y-2">
                                                {feedback.areasToImprove.map((area, idx) => (
                                                    <li 
                                                        key={idx} 
                                                        className="flex items-start gap-2 text-sm text-foreground/80 leading-relaxed"
                                                    >
                                                        <span className="text-amber-500 mt-1">•</span>
                                                        <span>{area}</span>
                                                    </li>
                                                ))}
                                            </ul>
                                        </div>
                                    )}

                                    {/* Recommendations Section */}
                                    {feedback.recommendations.length > 0 && (
                                        <div className="p-4 border-t border-border/30">
                                            <div className="flex items-center gap-2 mb-3">
                                                <div className="h-6 w-6 rounded-lg bg-brand-100 dark:bg-brand-900/30 flex items-center justify-center">
                                                    <Lightbulb className="h-3.5 w-3.5 text-brand-600 dark:text-brand-400" />
                                                </div>
                                                <h4 className="text-xs font-bold text-foreground uppercase tracking-wider">
                                                    Recommendations
                                                </h4>
                                            </div>
                                            <ul className="space-y-2">
                                                {feedback.recommendations.map((rec, idx) => (
                                                    <li 
                                                        key={idx} 
                                                        className="flex items-start gap-2 text-sm text-foreground/80 leading-relaxed"
                                                    >
                                                        <span className="text-brand-500 mt-1">•</span>
                                                        <span>{rec}</span>
                                                    </li>
                                                ))}
                                            </ul>
                                        </div>
                                    )}

                                    {/* STAR Examples Section */}
                                    {feedback.starExamples.length > 0 && (
                                        <div className="p-4 border-t border-border/30">
                                            <div className="flex items-center gap-2 mb-3">
                                                <div className="h-6 w-6 rounded-lg bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center">
                                                    <Star className="h-3.5 w-3.5 text-purple-600 dark:text-purple-400" />
                                                </div>
                                                <h4 className="text-xs font-bold text-foreground uppercase tracking-wider">
                                                    STAR Method Examples
                                                </h4>
                                            </div>
                                            <div className="space-y-3">
                                                {feedback.starExamples.map((example, idx) => (
                                                    <div 
                                                        key={idx} 
                                                        className="p-3 rounded-lg bg-purple-50/50 dark:bg-purple-900/10 border border-purple-100 dark:border-purple-800/30"
                                                    >
                                                        <p className="text-xs font-semibold text-purple-700 dark:text-purple-300 mb-1">
                                                            {example.situation}
                                                        </p>
                                                        <p className="text-sm text-foreground/80 mb-1">
                                                            <span className="font-medium">Experience:</span> {example.relevantExperience}
                                                        </p>
                                                        <p className="text-xs text-muted-foreground italic">
                                                            💡 {example.tip}
                                                        </p>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    {/* Keywords Section */}
                                    {(feedback.matchedKeywords.length > 0 || feedback.missingKeywords.length > 0) && (
                                        <div className="p-4 border-t border-border/30">
                                            <div className="flex items-center gap-2 mb-3">
                                                <div className="h-6 w-6 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                                                    <Sparkles className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" />
                                                </div>
                                                <h4 className="text-xs font-bold text-foreground uppercase tracking-wider">
                                                    Keywords Analysis
                                                </h4>
                                            </div>
                                            
                                            {feedback.matchedKeywords.length > 0 && (
                                                <div className="mb-3">
                                                    <p className="text-xs text-muted-foreground mb-2">✓ Found in your resume:</p>
                                                    <div className="flex flex-wrap gap-1.5">
                                                        {feedback.matchedKeywords.slice(0, 8).map((kw, idx) => (
                                                            <Badge 
                                                                key={idx} 
                                                                variant="outline" 
                                                                className="text-[10px] bg-green-50 text-green-700 border-green-200 dark:bg-green-900/20 dark:text-green-400 dark:border-green-800"
                                                            >
                                                                {kw}
                                                            </Badge>
                                                        ))}
                                                    </div>
                                                </div>
                                            )}
                                            
                                            {feedback.missingKeywords.length > 0 && (
                                                <div>
                                                    <p className="text-xs text-muted-foreground mb-2">✗ Consider adding:</p>
                                                    <div className="flex flex-wrap gap-1.5">
                                                        {feedback.missingKeywords.slice(0, 6).map((kw, idx) => (
                                                            <Badge 
                                                                key={idx} 
                                                                variant="outline" 
                                                                className="text-[10px] bg-red-50 text-red-700 border-red-200 dark:bg-red-900/20 dark:text-red-400 dark:border-red-800"
                                                            >
                                                                {kw}
                                                            </Badge>
                                                        ))}
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    )}

                                    {/* Company Insights Section */}
                                    {feedback.companyInsights.length > 0 && (
                                        <div className="p-4 border-t border-border/30">
                                            <div className="flex items-center gap-2 mb-3">
                                                <div className="h-6 w-6 rounded-lg bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center">
                                                    <AlertCircle className="h-3.5 w-3.5 text-indigo-600 dark:text-indigo-400" />
                                                </div>
                                                <h4 className="text-xs font-bold text-foreground uppercase tracking-wider">
                                                    Company Insights
                                                </h4>
                                            </div>
                                            <ul className="space-y-2">
                                                {feedback.companyInsights.map((insight, idx) => (
                                                    <li 
                                                        key={idx} 
                                                        className="flex items-start gap-2 text-sm text-foreground/80 leading-relaxed"
                                                    >
                                                        <span className="text-indigo-500 mt-1">•</span>
                                                        <span>{insight}</span>
                                                    </li>
                                                ))}
                                            </ul>
                                        </div>
                                    )}
                                </div>
                            </CardContent>
                        )}
                    </Card>
                </div>
            )}
        </div>
    );
}
