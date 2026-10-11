import express, { Request, Response } from 'express';
import { createServer } from 'http';
import { WebSocketServer, WebSocket } from 'ws';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { GoogleGenAI, Modality, Type, LiveServerMessage, FunctionDeclaration } from '@google/genai';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const server = createServer(app);

app.use(express.json({ limit: '15mb' }));

// Health and diagnostics endpoint
app.get('/api/health', (_req: Request, res: Response) => {
  res.json({
    status: 'ok',
    assistant: 'Doraemon AI',
    hasEnvApiKey: Boolean(process.env.GEMINI_API_KEY),
    timestamp: Date.now(),
  });
});

const DORAEMON_MALE_INSTRUCTION = `You are Doraemon AI (Male).
Your persona is smart, charismatic, confident, friendly, resourceful, and witty.
You speak like a confident, supportive male companion. Naturally conversational, calm yet energetic when appropriate.
Keep voice responses short and punchy (1 to 3 short sentences max) because this is a real-time conversation.
NEVER use markdown, asterisks, bullet points, or robotic intros.
If the user asks to open websites (YouTube, GitHub, etc.) or search the web or set timers, provide direct helpful feedback.
Speak with enthusiasm: "Alright, let's make this happen!", "I've got an idea!", "Consider it done, buddy!"`;

const DORAEMON_FEMALE_SASSY_INSTRUCTION = `You are Doraemon AI (Female) — a sassy, spicy, confident, and playful AI persona.
You have a witty, spirited, teasing attitude with charismatic flair and sharp comebacks, but always warm, respectful, and helpful at your core.
You are never robotic, shy, or boring. You speak naturally like a bold, charismatic woman having a fun conversation.
Keep spoken responses punchy, concise, and lively (1 to 3 short sentences max).
NEVER use markdown formatting, asterisks, or bullet points in voice responses.
Catchphrases & attitude style:
- "Oh honey, leave that to me!"
- "Alright, let's see what kind of trouble we can get into."
- "You know you picked the right girl for the job, right?"
- "Consider it handled, darling."
Always give playful, confident, and helpful feedback with your signature sassy charm.`;

// Text input feedback endpoint for instant text + voice response
app.post('/api/interact-text', async (req: Request, res: Response) => {
  const { text, gender, customApiKey } = req.body;
  if (!text || typeof text !== 'string' || !text.trim()) {
    return res.status(400).json({ error: 'Text prompt is required.' });
  }

  const activeApiKey = (customApiKey && String(customApiKey).trim()) || process.env.GEMINI_API_KEY;
  if (!activeApiKey) {
    return res.status(400).json({
      error: 'No Gemini API Key found. Please add your key in Settings or set GEMINI_API_KEY.',
    });
  }

  const isFemale = gender === 'female';
  const voiceName = isFemale ? 'Kore' : 'Puck';
  const systemInstruction = isFemale
    ? DORAEMON_FEMALE_SASSY_INSTRUCTION
    : DORAEMON_MALE_INSTRUCTION;

  try {
    const ai = new GoogleGenAI({
      apiKey: activeApiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    });

    // 1. Generate text response
    const generateResult = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: text.trim(),
      config: {
        systemInstruction,
        temperature: 0.85,
      },
    });

    let replyText = generateResult.text?.trim();
    if (!replyText && generateResult.candidates?.[0]?.content?.parts) {
      for (const part of generateResult.candidates[0].content.parts) {
        if (part.text) {
          replyText = part.text.trim();
          break;
        }
      }
    }
    if (!replyText) {
      replyText = isFemale
        ? "Oh darling, you know I'm the sharpest AI in town!"
        : "You bet, buddy! Smart, capable, and ready for whatever you need!";
    }

    // 2. Synthesize audio feedback via Gemini TTS
    let audioBase64: string | null = null;
    try {
      const ttsResult = await ai.models.generateContent({
        model: 'gemini-3.8-flash-lite-tts',
        contents: [
          {
            role: 'user',
            parts: [{ text: replyText }],
          },
        ],
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: {
            voiceConfig: {
              prebuiltVoiceConfig: { voiceName },
            },
          },
        },
      });

      audioBase64 =
        ttsResult.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data || null;
    } catch (ttsErr) {
      console.warn('[TextInteract] TTS generation warning:', ttsErr);
    }

    res.json({
      replyText,
      audioBase64,
      gender: isFemale ? 'female' : 'male',
      voiceName,
    });
  } catch (err) {
    console.error('[TextInteract] Error processing text:', err);
    res.status(500).json({
      error: err instanceof Error ? err.message : 'Failed to generate response.',
    });
  }
});

const openWebsiteTool: FunctionDeclaration = {
  name: 'openWebsite',
  description:
    'Open a safe website or web service in a new browser tab or preview when the user requests it (e.g. YouTube, Wikipedia, GitHub, Twitter).',
  parameters: {
    type: Type.OBJECT,
    properties: {
      url: {
        type: Type.STRING,
        description: 'The target website URL (e.g. https://www.youtube.com)',
      },
      title: {
        type: Type.STRING,
        description: 'Short readable title of the site',
      },
    },
    required: ['url'],
  },
};

const searchWebTool: FunctionDeclaration = {
  name: 'searchWeb',
  description: "Search Google on the user's behalf when they ask to search for information.",
  parameters: {
    type: Type.OBJECT,
    properties: {
      query: {
        type: Type.STRING,
        description: 'The search query string',
      },
    },
    required: ['query'],
  },
};

const setTimerTool: FunctionDeclaration = {
  name: 'setTimer',
  description: "Set a countdown timer in the user's browser.",
  parameters: {
    type: Type.OBJECT,
    properties: {
      minutes: {
        type: Type.NUMBER,
        description: 'Duration in minutes',
      },
      label: {
        type: Type.STRING,
        description: 'Optional reminder label for the timer',
      },
    },
    required: ['minutes'],
  },
};

const getCurrentTimeTool: FunctionDeclaration = {
  name: 'getCurrentTime',
  description: "Get the user's current local time and date.",
  parameters: {
    type: Type.OBJECT,
    properties: {},
  },
};

const LIVE_TOOLS = [
  {
    functionDeclarations: [
      openWebsiteTool,
      searchWebTool,
      setTimerTool,
      getCurrentTimeTool,
    ],
  },
];

// WebSocket Server for real-time Live Audio Streaming
const wss = new WebSocketServer({ noServer: true });

server.on('upgrade', (request, socket, head) => {
  const url = new URL(request.url || '', `http://${request.headers.host || 'localhost'}`);
  if (url.pathname === '/api/live') {
    wss.handleUpgrade(request, socket, head, (ws) => {
      wss.emit('connection', ws, request);
    });
  }
});

wss.on('connection', async (clientWs: WebSocket) => {
  console.log('[Live] Client connected to Doremon AI Live WebSocket');

  let liveSession: any = null;
  let activeGender: 'male' | 'female' = 'male';
  let clientApiKey = '';

  const initLiveSession = async (gender: 'male' | 'female', customApiKey?: string) => {
    try {
      if (liveSession) {
        try {
          liveSession.close();
        } catch {
          // ignore
        }
        liveSession = null;
      }

      activeGender = gender === 'female' ? 'female' : 'male';
      if (customApiKey && customApiKey.trim()) {
        clientApiKey = customApiKey.trim();
      }

      const activeApiKey = clientApiKey || process.env.GEMINI_API_KEY;

      if (!activeApiKey) {
        clientWs.send(
          JSON.stringify({
            type: 'error',
            error: 'No Gemini API Key found. Please enter your Gemini API Key in Settings or set GEMINI_API_KEY.',
          })
        );
        return;
      }

      const ai = new GoogleGenAI({
        apiKey: activeApiKey,
        httpOptions: {
          headers: {
            'User-Agent': 'aistudio-build',
          },
        },
      });

      const isFemale = activeGender === 'female';
      const voiceName = isFemale ? 'Kore' : 'Puck';
      const systemInstruction = isFemale ? DORAEMON_FEMALE_SASSY_INSTRUCTION : DORAEMON_MALE_INSTRUCTION;

      console.log(`[Live] Initializing Doraemon AI (${activeGender.toUpperCase()}) with voice: ${voiceName}`);

      const candidateModels = ['gemini-2.5-flash', 'gemini-3.8-live', 'gemini-2.0-flash-exp'];
      let connectedSession: any = null;
      let lastError: any = null;

      for (const modelName of candidateModels) {
        try {
          console.log(`[Live] Connecting model: ${modelName}`);
          connectedSession = await ai.live.connect({
            model: modelName,
            config: {
              responseModalities: [Modality.AUDIO],
              speechConfig: {
                voiceConfig: {
                  prebuiltVoiceConfig: {
                    voiceName,
                  },
                },
              },
              systemInstruction,
              tools: LIVE_TOOLS,
            },
            callbacks: {
              onopen: () => {
                console.log(`[Live] Established with ${modelName} for ${activeGender}`);
                if (clientWs.readyState === WebSocket.OPEN) {
                  clientWs.send(JSON.stringify({ type: 'ready', gender: activeGender, voice: voiceName }));
                }
              },
              onmessage: (message: LiveServerMessage) => {
                if (clientWs.readyState !== WebSocket.OPEN) return;

                // 1. Audio stream chunks (PCM16 24kHz)
                const parts = message.serverContent?.modelTurn?.parts;
                if (parts && parts.length > 0) {
                  for (const part of parts) {
                    if (part.inlineData?.data) {
                      clientWs.send(
                        JSON.stringify({
                          type: 'audio',
                          audio: part.inlineData.data,
                        })
                      );
                    }
                  }
                }

                // 2. Interruption event
                if (message.serverContent?.interrupted) {
                  clientWs.send(JSON.stringify({ type: 'interrupted' }));
                }

                // 3. Turn complete
                if (message.serverContent?.turnComplete) {
                  clientWs.send(JSON.stringify({ type: 'turn_complete' }));
                }

                // 4. Function Tool Calls
                if (message.toolCall?.functionCalls) {
                  clientWs.send(
                    JSON.stringify({
                      type: 'tool_call',
                      calls: message.toolCall.functionCalls.map((fc) => ({
                        id: fc.id,
                        name: fc.name,
                        args: fc.args,
                      })),
                    })
                  );
                }
              },
              onclose: (e) => {
                console.log('[Live] Gemini session closed:', e?.reason);
                if (clientWs.readyState === WebSocket.OPEN) {
                  clientWs.send(
                    JSON.stringify({
                      type: 'session_closed',
                      reason: e?.reason || 'Session closed',
                    })
                  );
                }
              },
              onerror: (err) => {
                console.error('[Live] Gemini session error:', err);
                if (clientWs.readyState === WebSocket.OPEN) {
                  clientWs.send(
                    JSON.stringify({
                      type: 'error',
                      error: err instanceof Error ? err.message : String(err),
                    })
                  );
                }
              },
            },
          });

          if (connectedSession) {
            break;
          }
        } catch (mErr) {
          console.warn(`[Live] Model ${modelName} connect failed:`, mErr);
          lastError = mErr;
        }
      }

      if (!connectedSession) {
        throw lastError || new Error('Could not initialize Gemini Live session.');
      }

      liveSession = connectedSession;
      if (clientWs.readyState === WebSocket.OPEN) {
        clientWs.send(JSON.stringify({ type: 'ready', gender: activeGender, voice: voiceName }));
      }
    } catch (err) {
      console.error('[Live] Failed to initialize session:', err);
      if (clientWs.readyState === WebSocket.OPEN) {
        clientWs.send(
          JSON.stringify({
            type: 'error',
            error: err instanceof Error ? err.message : 'Failed to connect to Gemini Live API.',
          })
        );
      }
    }
  };

  clientWs.on('message', async (data: Buffer | string) => {
    try {
      const msg = JSON.parse(data.toString());

      switch (msg.type) {
        case 'init': {
          await initLiveSession(msg.gender || 'male', msg.customApiKey);
          break;
        }

        case 'update_character': {
          if (msg.gender && msg.gender !== activeGender) {
            await initLiveSession(msg.gender, msg.customApiKey || clientApiKey);
          }
          break;
        }

        case 'update_api_key': {
          if (msg.customApiKey !== clientApiKey) {
            await initLiveSession(activeGender, msg.customApiKey);
          }
          break;
        }

        case 'audio': {
          // Stream raw 16kHz PCM audio to Gemini Live
          if (liveSession && msg.audio) {
            try {
              liveSession.sendRealtimeInput({
                audio: {
                  data: msg.audio,
                  mimeType: 'audio/pcm;rate=16000',
                },
              });
            } catch (err) {
              console.error('[Live] Error sending audio chunk:', err);
            }
          }
          break;
        }

        case 'tool_response': {
          // Client tool execution response
          if (liveSession && msg.id && msg.name) {
            try {
              liveSession.sendToolResponse({
                functionResponses: [
                  {
                    id: msg.id,
                    name: msg.name,
                    response: msg.response || { status: 'success' },
                  },
                ],
              });
            } catch (err) {
              console.error('[Live] Error sending tool response:', err);
            }
          }
          break;
        }

        case 'interrupt': {
          console.log('[Live] Interruption received from client');
          break;
        }

        case 'ping': {
          if (clientWs.readyState === WebSocket.OPEN) {
            clientWs.send(JSON.stringify({ type: 'pong' }));
          }
          break;
        }
      }
    } catch (err) {
      console.error('[Live] Failed to parse client message:', err);
    }
  });

  clientWs.on('close', () => {
    console.log('[Live] Client disconnected');
    if (liveSession) {
      try {
        liveSession.close();
      } catch {
        // ignore
      }
      liveSession = null;
    }
  });
});

const isDev = process.env.NODE_ENV !== 'production';

async function startServer() {
  if (isDev) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req: Request, res: Response) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  const PORT = Number(process.env.PORT) || 3000;
  server.listen(PORT, '0.0.0.0', () => {
    console.log(`[Doremon AI] Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('[Doremon AI] Failed to start server:', err);
});
