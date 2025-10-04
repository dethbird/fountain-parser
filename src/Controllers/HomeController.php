<?php
declare(strict_types=1);

namespace App\Controllers;

use Psr\Http\Message\ResponseInterface as Response;
use Psr\Http\Message\ServerRequestInterface as Request;

class HomeController
{
    public function index(Request $request, Response $response, array $args): Response
    {
        $data = [
            'message' => 'Welcome to Fountain Parser API',
            'version' => '1.0.0',
            'endpoints' => [
                'health' => '/api/health'
            ]
        ];
        
        $response->getBody()->write(json_encode($data, JSON_PRETTY_PRINT));
        return $response->withHeader('Content-Type', 'application/json');
    }
}