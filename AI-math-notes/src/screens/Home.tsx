import { ColorSwatch, Group } from '@mantine/core';
import { Button } from '@/components/ui/button';
import { useEffect, useRef, useState } from 'react';
import axios from 'axios';
import Draggable from 'react-draggable';
import { SWATCHES } from '@/constants';

interface GeneratedResult {
    expression: string | number;
    answer: string | number;
}

interface Response {
    expr: string;
    result: string;
    assign: boolean;
}

export default function Home() {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [isDrawing, setIsDrawing] = useState(false);
    const [isEraser, setIsEraser] = useState(false);
    const [color, setColor] = useState('rgb(255, 255, 255)');
    const [reset, setReset] = useState(false);
    const [dictOfVars, setDictOfVars] = useState<Record<string, string>>({});
    const [result, setResult] = useState<GeneratedResult | null>(null);
    const [latexPosition, setLatexPosition] = useState({ x: 10, y: 200 });
    const [latexExpression, setLatexExpression] = useState<Array<string>>([]);

    useEffect(() => {
        if (latexExpression.length > 0 && window.MathJax) {
            setTimeout(() => {
                window.MathJax.Hub.Queue(["Typeset", window.MathJax.Hub]);
            }, 0);
        }
    }, [latexExpression]);

    useEffect(() => {
        if (result) {
            renderLatexToCanvas(result.expression, result.answer);
        }
    }, [result]);

    useEffect(() => {
        if (reset) {
            resetCanvas();
            setLatexExpression([]);
            setResult(null);
            setDictOfVars({});
            setReset(false);
        }
    }, [reset]);

    const drawGrid = (ctx: CanvasRenderingContext2D, canvas: HTMLCanvasElement) => {
        const gridSize = 20;
        ctx.strokeStyle = '#333333';
        ctx.lineWidth = 0.5;

        for (let x = 0; x <= canvas.width; x += gridSize) {
            ctx.beginPath();
            ctx.moveTo(x, 0);
            ctx.lineTo(x, canvas.height);
            ctx.stroke();
        }

        for (let y = 0; y <= canvas.height; y += gridSize) {
            ctx.beginPath();
            ctx.moveTo(0, y);
            ctx.lineTo(canvas.width, y);
            ctx.stroke();
        }
    };

    useEffect(() => {
        const canvas = canvasRef.current;
    
        if (canvas) {
            const ctx = canvas.getContext('2d');
            if (ctx) {
                canvas.width = window.innerWidth;
                canvas.height = window.innerHeight - canvas.offsetTop;
                ctx.lineCap = 'round';
                ctx.lineWidth = 3;
                
                canvas.style.background = 'black';
                drawGrid(ctx, canvas);
            }
        }

        const script = document.createElement('script');
        script.src = 'https://cdnjs.cloudflare.com/ajax/libs/mathjax/2.7.9/MathJax.js?config=TeX-MML-AM_CHTML';
        script.async = true;
        document.head.appendChild(script);

        script.onload = () => {
            window.MathJax.Hub.Config({
                tex2jax: {inlineMath: [['$', '$'], ['\\(', '\\)']]},
            });
        };

        return () => {
            if (script.parentNode) {
                script.parentNode.removeChild(script);
            }
        };
    }, []);

    const formatExpression = (expression: string | number): string => {
        const expressionStr = String(expression);
        
        // First, add spaces between words using a more sophisticated regex
        let formatted = expressionStr
            // Add space between lowercase and uppercase letters (camelCase)
            .replace(/([a-z])([A-Z])/g, '$1 $2')
            // Add space between numbers and letters
            .replace(/([0-9])([a-zA-Z])/g, '$1 $2')
            .replace(/([a-zA-Z])([0-9])/g, '$1 $2')
            // Add spaces around operators
            .replace(/([+\-*/=])/g, ' $1 ')
            // Replace multiple spaces with single space
            .replace(/\s+/g, ' ')
            .trim();
        
        // Format specific cases
        formatted = formatted
            // Fix function names with parentheses
            .replace(/(\w+)\s*\(/g, '$1(')
            // Format commas in function arguments
            .replace(/\s*,\s*/g, ', ')
            // Remove spaces after opening parenthesis
            .replace(/\(\s+/g, '(')
            // Remove spaces before closing parenthesis
            .replace(/\s+\)/g, ')')
            // Ensure equals sign has spaces
            .replace(/\s*=\s*/g, ' = ');
        
        return formatted;
    };

    const renderLatexToCanvas = (expression: string | number | null | undefined, answer: string | number | null | undefined) => {
        if (expression === null || expression === undefined || answer === null || answer === undefined) {
            return;
        }

        const formattedExpression = formatExpression(expression);
        const formattedAnswer = formatExpression(answer);
        const latex = `\\(\\LARGE{${formattedExpression} = ${formattedAnswer}}\\)`;
        setLatexExpression(prev => [...prev, latex]);

        const canvas = canvasRef.current;
        if (canvas) {
            const ctx = canvas.getContext('2d');
            if (ctx) {
                ctx.clearRect(0, 0, canvas.width, canvas.height);
                drawGrid(ctx, canvas);
            }
        }
    };

    const resetCanvas = () => {
        const canvas = canvasRef.current;
        if (canvas) {
            const ctx = canvas.getContext('2d');
            if (ctx) {
                ctx.clearRect(0, 0, canvas.width, canvas.height);
                drawGrid(ctx, canvas);
            }
        }
    };

    const startDrawing = (e: React.MouseEvent<HTMLCanvasElement>) => {
        const canvas = canvasRef.current;
        if (canvas) {
            const ctx = canvas.getContext('2d');
            if (ctx) {
                ctx.beginPath();
                ctx.moveTo(e.nativeEvent.offsetX, e.nativeEvent.offsetY);
                setIsDrawing(true);
            }
        }
    };

    const draw = (e: React.MouseEvent<HTMLCanvasElement>) => {
        if (!isDrawing) return;
        const canvas = canvasRef.current;
        if (canvas) {
            const ctx = canvas.getContext('2d');
            if (ctx) {
                if (isEraser) {
                    ctx.strokeStyle = 'black';
                    ctx.lineWidth = 20;
                } else {
                    ctx.strokeStyle = color;
                    ctx.lineWidth = 3;
                }
                ctx.lineTo(e.nativeEvent.offsetX, e.nativeEvent.offsetY);
                ctx.stroke();
            }
        }
    };

    const stopDrawing = () => {
        setIsDrawing(false);
    };  

    const runRoute = async () => {
        try {
            const canvas = canvasRef.current;
        
            if (canvas) {
                const backend_url = "http://localhost:8900";
                const response = await axios({
                    method: 'post',
                    url: `${backend_url}/calculate`,
                    data: {
                        image: canvas.toDataURL('image/png'),
                        dict_of_vars: dictOfVars
                    }
                });

                if (response.data && response.data.data) {
                    const resp = response.data;
                    console.log('Backend Response:', resp);

                    resp.data.forEach((data: Response) => {
                        if (data.assign === true) {
                            setDictOfVars(prevVars => ({
                                ...prevVars,
                                [data.expr]: data.result
                            }));
                        }
                    });

                    const ctx = canvas.getContext('2d');
                    if (ctx) {
                        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
                        let minX = canvas.width, minY = canvas.height, maxX = 0, maxY = 0;

                        for (let y = 0; y < canvas.height; y++) {
                            for (let x = 0; x < canvas.width; x++) {
                                const i = (y * canvas.width + x) * 4;
                                if (imageData.data[i + 3] > 0) {
                                    minX = Math.min(minX, x);
                                    minY = Math.min(minY, y);
                                    maxX = Math.max(maxX, x);
                                    maxY = Math.max(maxY, y);
                                }
                            }
                        }

                        const centerX = (minX + maxX) / 2;
                        const centerY = (minY + maxY) / 2;
                        setLatexPosition({ x: centerX, y: centerY });

                        resp.data.forEach((data: Response) => {
                            if (data.expr && data.result) {
                                setResult({
                                    expression: data.expr,
                                    answer: data.result
                                });
                            }
                        });
                    }
                } else {
                    console.error('Invalid response format:', response);
                }
            }
        } catch (error) {
            console.error('Error in runRoute:', error);
        }
    };

    return (
        <>
            <div className='grid grid-cols-4 gap-2'>
                <Button
                    onClick={() => setReset(true)}
                    className='z-20 bg-black text-white'
                    variant='default' 
                    color='black'
                >
                    Reset
                </Button>
                <Button
                    onClick={() => setIsEraser(!isEraser)}
                    className={`z-20 ${isEraser ? 'bg-red-500' : 'bg-black'} text-white`}
                    variant='default'
                >
                    {isEraser ? 'Drawing' : 'Eraser'}
                </Button>
                <Group className='z-20'>
                    {SWATCHES.map((swatch) => (
                        <ColorSwatch 
                            key={swatch} 
                            color={swatch} 
                            onClick={() => {
                                setColor(swatch);
                                setIsEraser(false);
                            }} 
                        />
                    ))}
                </Group>
                <Button
                    onClick={runRoute}
                    className='z-20 bg-black text-white'
                    variant='default'
                    color='white'
                >
                    Run
                </Button>
            </div>

            <canvas
                ref={canvasRef}
                id='canvas'
                className='absolute top-0 left-0 w-full h-full'
                onMouseDown={startDrawing}
                onMouseMove={draw}
                onMouseUp={stopDrawing}
                onMouseOut={stopDrawing}
            />

            {latexExpression && latexExpression.map((latex, index) => (
                <Draggable
                    key={index}
                    defaultPosition={latexPosition}
                    onStop={(e, data) => setLatexPosition({ x: data.x, y: data.y })}
                >
                    <div className="absolute p-2 text-white rounded shadow-md">
                        <div className="latex-content">{latex}</div>
                    </div>
                </Draggable>
            ))}
        </>
    );
}