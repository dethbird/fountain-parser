<?php
declare(strict_types=1);

namespace App\Controllers;

use Psr\Http\Message\ResponseInterface as Response;
use Psr\Http\Message\ServerRequestInterface as Request;
use Slim\Views\Twig;

class HomeController
{
    public function index(Request $request, Response $response, array $args): Response
    {
        $view = Twig::fromRequest($request);
        
        return $view->render($response, 'index.html.twig', [
            'title' => 'Fountain Parser - Home',
            'version' => '1.0.0'
        ]);
    }
}