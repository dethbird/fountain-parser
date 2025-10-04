<?php
declare(strict_types=1);

namespace App\Middleware;

use Psr\Http\Message\ServerRequestInterface as Request;
use Psr\Http\Server\MiddlewareInterface;
use Psr\Http\Server\RequestHandlerInterface as Handler;
use Psr\Http\Message\ResponseInterface as Response;
use Slim\Psr7\Response as SlimResponse;

final class CorsMiddleware implements MiddlewareInterface
{
    public function process(Request $request, Handler $handler): Response
    {
        $origin  = $_ENV['CORS_ALLOW_ORIGIN']  ?? '*';
        $methods = $_ENV['CORS_ALLOW_METHODS'] ?? 'GET,POST,OPTIONS';
        $headers = $_ENV['CORS_ALLOW_HEADERS'] ?? 'Content-Type,Authorization';

        if (strtoupper($request->getMethod()) === 'OPTIONS') {
            $resp = new SlimResponse(204);
            return $this->withCors($resp, $origin, $methods, $headers);
        }

        $response = $handler->handle($request);
        return $this->withCors($response, $origin, $methods, $headers);
    }

    private function withCors(Response $response, string $origin, string $methods, string $headers): Response
    {
        return $response
            ->withHeader('Access-Control-Allow-Origin', $origin)
            ->withHeader('Access-Control-Allow-Methods', $methods)
            ->withHeader('Access-Control-Allow-Headers', $headers);
    }
}
