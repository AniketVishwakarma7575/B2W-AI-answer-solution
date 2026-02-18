# AI Multi-Question App

A full-stack web application that allows users to ask multiple questions at once and receive AI-powered answers using OpenRouter's GPT-4o-mini model.

## Features

- **Multi-Question Support**: Enter multiple questions (one per line) and get answers for all of them
- **Sequential Answer Display**: Answers appear one by one with smooth animations
- **Modern UI**: Clean, responsive design with gradient backgrounds and smooth transitions
- **Error Handling**: Comprehensive error handling for both frontend and backend
- **Production Ready**: Proper environment configuration and security practices

## Tech Stack

### Backend
- **Node.js** with Express.js
- **dotenv** for environment variable management
- **CORS** for cross-origin requests
- **node-fetch** for HTTP requests to OpenRouter API

### Frontend
- **React** (Create React App)
- **Axios** for HTTP requests
- **Modern CSS** with animations and responsive design

## Project Structure

```
ai-multi-question-app/
│
├── backend/
│   ├── server.js              # Main Express server
│   ├── package.json           # Backend dependencies
│   └── .env                   # Environment variables (API key)
│
├── frontend/
│   ├── src/
│   │   ├── App.js            # Main React component
│   │   ├── App.css           # App-specific styles
│   │   ├── index.js          # React entry point
│   │   └── index.css         # Global styles
│   ├── public/
│   │   └── index.html        # HTML template
│   └── package.json          # Frontend dependencies
│
└── README.md                 # This file
```

## Setup Instructions

### 1. Clone the Repository

```bash
git clone <repository-url>
cd ai-multi-question-app
```

### 2. Backend Setup

1. Navigate to the backend directory:
```bash
cd backend
```

2. Install dependencies:
```bash
npm install
```

3. Set up environment variables:
   - Copy the `.env` file and update it with your OpenRouter API key:
   ```env
   OPENROUTER_API_KEY=your_actual_api_key_here
   PORT=5000
   ```

4. Start the backend server:
```bash
npm start
```

The backend will run on `http://localhost:5000`

### 3. Frontend Setup

1. Navigate to the frontend directory (from the project root):
```bash
cd frontend
```

2. Install dependencies:
```bash
npm install
```

3. Start the frontend development server:
```bash
npm start
```

The frontend will run on `http://localhost:3000`

## Usage

1. **Get an OpenRouter API Key**:
   - Visit [OpenRouter.ai](https://openrouter.ai/)
   - Create an account and generate an API key
   - Add the key to your `backend/.env` file

2. **Run the Application**:
   - Start both backend and frontend servers as described above
   - Open `http://localhost:3000` in your browser

3. **Ask Questions**:
   - Enter multiple questions in the textarea (one per line)
   - Click "Get Answers" to process all questions
   - Watch as answers appear one by one with smooth animations

## API Endpoints

### Backend Endpoints

- `GET /health` - Health check endpoint
- `POST /api/ask-questions` - Main endpoint for processing questions

#### Request Format (POST /api/ask-questions)
```json
{
  "questions": [
    "What is the capital of France?",
    "How does photosynthesis work?",
    "What are the benefits of meditation?"
  ]
}
```

#### Response Format
```json
{
  "success": true,
  "answers": [
    {
      "question": "What is the capital of France?",
      "answer": "The capital of France is Paris...",
      "error": false
    }
  ],
  "totalQuestions": 3,
  "successfulAnswers": 3
}
```

## Environment Variables

### Backend (.env)
- `OPENROUTER_API_KEY`: Your OpenRouter API key (required)
- `PORT`: Server port (optional, defaults to 5000)

## Development Scripts

### Backend
- `npm start` - Start the production server
- `npm run dev` - Start the development server with nodemon

### Frontend
- `npm start` - Start the development server
- `npm run build` - Build for production
- `npm test` - Run tests
- `npm run eject` - Eject from Create React App

## Features in Detail

### Error Handling
- Frontend validation for empty questions
- Backend validation for API requests
- Graceful handling of API failures
- User-friendly error messages

### UI/UX Features
- Responsive design for mobile and desktop
- Smooth animations and transitions
- Loading states and progress indicators
- Question counter
- Clear button to reset the form
- Modern gradient design

### Security
- Environment variables for API keys
- CORS configuration
- Input validation and sanitization
- Rate limiting considerations (small delays between API calls)

## Production Deployment

### Backend Deployment
1. Set production environment variables
2. Install production dependencies: `npm install --production`
3. Use a process manager like PM2: `pm2 start server.js`
4. Set up reverse proxy with Nginx if needed

### Frontend Deployment
1. Build the application: `npm run build`
2. Deploy the `build` folder to your hosting service
3. Update the API endpoint in production if needed

## Troubleshooting

### Common Issues

1. **CORS Errors**: Ensure the backend is running and CORS is properly configured
2. **API Key Errors**: Verify your OpenRouter API key is correctly set in `.env`
3. **Port Conflicts**: Change the PORT in `.env` if 5000 is already in use
4. **Network Issues**: Check your internet connection and OpenRouter service status

### Debug Mode
- Backend logs show detailed processing information
- Frontend console shows API responses and errors
- Use browser developer tools for debugging

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

This project is licensed under the MIT License.

## Support

For issues and questions, please create an issue in the repository or contact the development team.
# B2W-AI-answer-solution
