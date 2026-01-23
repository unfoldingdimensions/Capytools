'use client';

import { useState } from 'react';
import { InterviewQuestion } from '@/types/ai.types';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ChevronDown, Lightbulb } from 'lucide-react';

interface InterviewQuestionsListProps {
    questions: InterviewQuestion[];
}

export default function InterviewQuestionsList({
    questions,
}: InterviewQuestionsListProps) {
    const [expandedQuestions, setExpandedQuestions] = useState<Set<number>>(
        new Set()
    );

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

    return (
        <div className="space-y-4">
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

            {/* Tips Section */}
            <Card className="bg-primary/5 border-primary/20">
                <CardContent className="p-4">
                    <div className="flex items-center gap-2 mb-2">
                        <Lightbulb className="h-4 w-4 text-primary" />
                        <h4 className="text-sm font-semibold text-primary">
                            Interview Preparation Tips
                        </h4>
                    </div>
                    <ul className="space-y-1 text-sm text-muted-foreground ml-6 list-disc">
                        <li>Practice answering each question out loud</li>
                        <li>Use the STAR method (Situation, Task, Action, Result) for behavioral questions</li>
                        <li>Prepare specific examples from your experience</li>
                        <li>Research the company and role thoroughly</li>
                    </ul>
                </CardContent>
            </Card>

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
    );
}

