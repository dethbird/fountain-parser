<?php
declare(strict_types=1);

use Slim\App;
use App\Controllers\HomeController;
use App\Controllers\HealthController;

return function (App $app): void {
    // API routes first
    $app->get('/api/health', [HealthController::class, 'index']);
    
    // Simple test route
    $app->get('/api/test', function ($request, $response, $args) {
        $response->getBody()->write('{"message": "Test route working"}');
        return $response->withHeader('Content-Type', 'application/json');
    });
    
    // Home route last
    $app->get('/', [HomeController::class, 'index']);
};
