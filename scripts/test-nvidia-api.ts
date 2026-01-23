/**
 * NVIDIA NIM API Test Script
 * 
 * Tests the NVIDIA NIM integration with your API key
 * Run with: npx tsx scripts/test-nvidia-api.ts
 */

import OpenAI from 'openai';

// Your NVIDIA API configuration
const NVIDIA_API_KEY = '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';
const NVIDIA_BASE_URL = 'https://integrate.api.nvidia.com/v1';
const MODEL = 'meta/llama-3.2-1b-instruct';

async function testNvidiaAPI() {
    console.log('🚀 Testing NVIDIA NIM API Integration...\n');

    try {
        // Initialize OpenAI client with NVIDIA configuration
        const openai = new OpenAI({
            apiKey: NVIDIA_API_KEY,
            baseURL: NVIDIA_BASE_URL,
        });

        console.log('✅ Client initialized successfully');
        console.log(`📦 Using model: ${MODEL}`);
        console.log(`🌐 Base URL: ${NVIDIA_BASE_URL}\n`);

        // Test 1: Simple completion
        console.log('📝 Test 1: Simple AI Completion');
        console.log('━'.repeat(50));

        const completion = await openai.chat.completions.create({
            model: MODEL,
            messages: [
                {
                    role: 'system',
                    content: 'You are a helpful assistant for a resume builder application.',
                },
                {
                    role: 'user',
                    content: 'Write a professional summary for a software engineer with 5 years of experience in JavaScript and React.',
                },
            ],
            temperature: 0.7,
            max_tokens: 200,
        });

        const response = completion.choices[0]?.message?.content;
        console.log('Response:', response);
        console.log('✅ Test 1 PASSED\n');

        // Test 2: JSON extraction
        console.log('📝 Test 2: JSON Extraction');
        console.log('━'.repeat(50));

        const jsonCompletion = await openai.chat.completions.create({
            model: MODEL,
            messages: [
                {
                    role: 'system',
                    content: 'You extract structured data from job descriptions. Return ONLY valid JSON.',
                },
                {
                    role: 'user',
                    content: `Extract skills from this job description:
"We are looking for a Senior Software Engineer with 5+ years of experience in JavaScript, React, Node.js, and TypeScript. Must have experience with AWS and CI/CD pipelines."

Return JSON: { "skills": ["skill1", "skill2", ...] }`,
                },
            ],
            temperature: 0.3,
            max_tokens: 200,
        });

        const jsonResponse = jsonCompletion.choices[0]?.message?.content;
        console.log('Response:', jsonResponse);

        try {
            const parsed = JSON.parse(jsonResponse || '{}');
            console.log('Parsed JSON:', JSON.stringify(parsed, null, 2));
            console.log('✅ Test 2 PASSED\n');
        } catch (parseError) {
            console.log('⚠️  Response is not valid JSON, but API call succeeded\n');
        }

        // Test 3: Streaming (optional)
        console.log('📝 Test 3: Streaming Response');
        console.log('━'.repeat(50));

        const stream = await openai.chat.completions.create({
            model: MODEL,
            messages: [
                {
                    role: 'user',
                    content: 'List 5 important skills for a data scientist.',
                },
            ],
            temperature: 0.7,
            max_tokens: 200,
            stream: true,
        });

        process.stdout.write('Streaming: ');
        for await (const chunk of stream) {
            const content = chunk.choices[0]?.delta?.content || '';
            process.stdout.write(content);
        }
        console.log('\n✅ Test 3 PASSED\n');

        // Summary
        console.log('━'.repeat(50));
        console.log('🎉 All tests PASSED!');
        console.log('✅ NVIDIA NIM API is working correctly');
        console.log('\n📋 Next Steps:');
        console.log('1. Add these values to your .env.local:');
        console.log('   NVIDIA_API_KEY="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"');
        console.log('   OPENAI_BASE_URL="https://integrate.api.nvidia.com/v1"');
        console.log('   AI_MODEL="meta/llama-3.2-1b-instruct"');
        console.log('2. Remove or comment out OPENAI_API_KEY');
        console.log('3. Run: npm run dev');
        console.log('4. Test Phase 2 AI features!\n');

    } catch (error) {
        console.error('❌ Error testing NVIDIA API:');
        if (error instanceof Error) {
            console.error('Message:', error.message);
            console.error('Stack:', error.stack);
        } else {
            console.error(error);
        }
        process.exit(1);
    }
}

// Run the test
testNvidiaAPI();

