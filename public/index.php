<?php
declare(strict_types=1);

use Slim\Factory\AppFactory;
use Slim\Views\Twig;
use Slim\Views\TwigMiddleware;

require __DIR__ . '/../vendor/autoload.php';

// Bootstrap env and app
$envFile = dirname(__DIR__).'/.env';
if (file_exists($envFile)) {
    $dotenv = Dotenv\Dotenv::createImmutable(dirname(__DIR__));
    $dotenv->load();
}

$app = AppFactory::create();

// Configure Twig
$twig = Twig::create(__DIR__ . '/../templates', [
    'cache' => false, // Set to a cache directory in production
]);

// Add Twig-View Middleware
$app->add(TwigMiddleware::create($app, $twig));

// Base path if deployed in a subdirectory
$basePath = $_ENV['APP_BASE_PATH'] ?? '';
if ($basePath) {
    $app->setBasePath($basePath);
}

// Middleware
$app->addBodyParsingMiddleware(); // JSON/form parsing
$app->addRoutingMiddleware();

$displayErrorDetails = filter_var($_ENV['APP_DEBUG'] ?? false, FILTER_VALIDATE_BOOL);
$errorMiddleware = $app->addErrorMiddleware($displayErrorDetails, true, true);

// CORS (very permissive; tune for production)
$app->add(new App\Middleware\CorsMiddleware());

// Routes
(require __DIR__ . '/../src/Routes.php')($app);

// Run
$app->run();
