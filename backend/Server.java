import java.sql.Connection;
import java.sql.DriverManager;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Statement;

import com.sun.net.httpserver.HttpServer;
import com.sun.net.httpserver.HttpHandler;
import com.sun.net.httpserver.HttpExchange;

import java.io.IOException;
import java.io.OutputStream;
import java.net.InetSocketAddress;

public class Server {

    private static final String DB_URL = "jdbc:sqlite:users.db";

    public static void main(String[] args) throws IOException {
        // Initialize SQLite database
        try (Connection conn = DriverManager.getConnection(DB_URL)) {
            if (conn != null) {
                String createTableSQL = "CREATE TABLE IF NOT EXISTS users (" +
                        "id INTEGER PRIMARY KEY AUTOINCREMENT," +
                        "name TEXT NOT NULL," +
                        "role TEXT NOT NULL," +
                        "device TEXT," +
                        "usage_time TEXT" +
                        ");";
                Statement stmt = conn.createStatement();
                stmt.execute(createTableSQL);
                System.out.println("Users table is ready.");
            }
        } catch (SQLException e) {
            System.out.println(e.getMessage());
        }

        // Start HTTP server
        HttpServer server = HttpServer.create(new InetSocketAddress(3000), 0);

        server.createContext("/api/wx/login", new HttpHandler() {
            @Override
            public void handle(HttpExchange exchange) throws IOException {
                if ("POST".equals(exchange.getRequestMethod())) {
                    // Handle login logic here
                    String response = "Login endpoint hit!";
                    exchange.sendResponseHeaders(200, response.getBytes().length);
                    OutputStream os = exchange.getResponseBody();
                    os.write(response.getBytes());
                    os.close();
                } else {
                    exchange.sendResponseHeaders(405, -1); // Method Not Allowed
                }
            }
        });

        server.createContext("/api/users/update", new HttpHandler() {
            @Override
            public void handle(HttpExchange exchange) throws IOException {
                if ("PUT".equals(exchange.getRequestMethod())) {
                    // Handle update logic here
                    String response = "Update endpoint hit!";
                    exchange.sendResponseHeaders(200, response.getBytes().length);
                    OutputStream os = exchange.getResponseBody();
                    os.write(response.getBytes());
                    os.close();
                } else {
                    exchange.sendResponseHeaders(405, -1); // Method Not Allowed
                }
            }
        });

        server.setExecutor(null); // creates a default executor
        server.start();
        System.out.println("Server is running on port 3000");
    }
}
