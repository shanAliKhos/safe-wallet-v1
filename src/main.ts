import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { NestExpressApplication } from '@nestjs/platform-express';
import { AppModule } from './app.module';
import { join } from 'path';
import cookieParser from 'cookie-parser';
import session from 'express-session';
const methodOverride = require('method-override');

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  
  // Cookie parser
  app.use(cookieParser());
  
  // Session
  app.use(
    session({
      secret: process.env.SESSION_SECRET || 'your-secret-key-change-in-production',
      resave: false,
      saveUninitialized: false,
      cookie: {
        secure: false,
        httpOnly: true,
        maxAge: 1000 * 60 * 60 * 24, // 24 hours
      },
    }),
  );
  
  // Method override
  app.use(methodOverride('_method'));
  
  // Set views directory and engine
  app.setBaseViewsDir(join(__dirname, '..', 'views'));
  app.useStaticAssets(join(__dirname, '..', 'public'));
  
  // Configure express-handlebars with layout support
  const exphbs = require('express-handlebars');
  const hbs = exphbs.create({
    extname: '.hbs',
    defaultLayout: 'app', // Use 'app' layout by default
    layoutsDir: join(__dirname, '..', 'views', 'layouts'),
    partialsDir: join(__dirname, '..', 'views', 'partials'),
    helpers: {
      eq: function(a, b) {
        return a === b;
      },
      // Helper to output raw HTML (for styles in head)
      raw: function(options) {
        return options.fn(this);
      },
      // Helper to output JSON for JavaScript
      json: function(context) {
        return JSON.stringify(context);
      },
    },
  });
  
  app.engine('hbs', hbs.engine);
  app.setViewEngine('hbs');
  
  // Set locals for views
  app.use((req, res, next) => {
    res.locals.app_name = 'Safe Wallet';
    res.locals.app_url = req.url;
    res.locals.currentRoute = req.path;
    res.locals.year = new Date().getFullYear();
    next();
  });
  
  // Enable global validation pipe
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
    }),
  );
  
  const port = process.env.PORT ?? 4000;
  await app.listen(port);
  console.log(`Server is running on port ${port} url: http://localhost:${port}`);
}
bootstrap();
