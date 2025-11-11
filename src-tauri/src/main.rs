// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use ssedge_lib::command;

fn main() {
    //ssedge_lib::run()
    command::init_logger().unwrap();
    command::init_db("ssedge.db".to_string()).unwrap();
}
