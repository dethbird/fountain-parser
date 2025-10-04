<?php
declare(strict_types=1);

namespace Tests\Feature;

use PHPUnit\Framework\TestCase;
use Slim\Factory\AppFactory;
use Slim\Psr7\Factory\ServerRequestFactory;

final class HealthTest extends TestCase
{
    public function testHealthEndpointReturnsOk(): void
    {
        $app = AppFactory::create();
        $app->addBodyParsingMiddleware();
        $app->addRoutingMiddleware();
        $displayErrorDetails = true;
        $app->addErrorMiddleware($displayErrorDetails, true, true);
        (require __DIR__ . '/../../src/Routes.php')($app);

        $request = (new ServerRequestFactory())->createServerRequest('GET', '/api/health');
        $response = $app->handle($request);

        $this->assertSame(200, $response->getStatusCode());
        $this->assertSame('application/json', $response->getHeaderLine('Content-Type'));
        $body = (string)$response->getBody();
        $this->assertStringContainsString('"ok":true', $body);
    }
}
