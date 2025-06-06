#!/usr/bin/env python3
"""
GitHub Pages Publisher

A robust cross-platform script to publish a project to GitHub Pages.
Features:
- Cross-platform compatibility (Windows, macOS, Linux)
- Checks for gh CLI installation and authentication
- Verifies remote repository connection
- Handles existing GitHub Pages
- Validates presence of web files
- Error detection and suggestions
"""

import os
import sys
import subprocess
import re
import platform
import shutil
import tempfile
from pathlib import Path
from typing import Tuple, Optional, List, Dict, Union
from enum import Enum
import json
import urllib.request
import urllib.error
import socket
import time
import glob

try:
    from rich.console import Console
    from rich.prompt import Confirm, Prompt
    from rich.panel import Panel
    from rich.syntax import Syntax
    from rich import print as rprint
except ImportError:
    print("The 'rich' library is required. Installing...")
    subprocess.run([sys.executable, "-m", "pip", "install", "rich"], check=False)
    from rich.console import Console
    from rich.prompt import Confirm, Prompt
    from rich.panel import Panel
    from rich.syntax import Syntax
    from rich import print as rprint

console = Console()


class Status(Enum):
    SUCCESS = "success"
    WARNING = "warning"
    ERROR = "error"
    INFO = "info"


def print_status(message: str, status: Status, details: str = None) -> None:
    """Print a formatted status message with optional details."""
    color_map = {
        Status.SUCCESS: "green",
        Status.WARNING: "yellow",
        Status.ERROR: "red",
        Status.INFO: "blue"
    }
    status_text = f"[{color_map[status]}]{status.value.upper()}[/{color_map[status]}]"
    
    console.print(f"{status_text}: {message}")
    if details:
        console.print(Panel(details, expand=False))


def is_windows() -> bool:
    """Check if the current platform is Windows."""
    return platform.system().lower() == "windows"


def is_macos() -> bool:
    """Check if the current platform is macOS."""
    return platform.system().lower() == "darwin"


def is_linux() -> bool:
    """Check if the current platform is Linux."""
    return platform.system().lower() == "linux"


def get_executable_extension() -> str:
    """Get the extension for executable files on the current platform."""
    return ".exe" if is_windows() else ""


def run_command(cmd: List[str], check: bool = True) -> Tuple[int, str, str]:
    """Run a command and return exit code, stdout, and stderr."""
    try:
        # For Windows, we need to set shell=True for some commands
        use_shell = is_windows() and cmd[0] in ["gh", "git"]
        
        # Add .exe extension for Windows if needed
        if is_windows() and cmd[0] in ["gh", "git"]:
            # Check if the command already has .exe
            if not cmd[0].endswith(".exe"):
                cmd[0] = f"{cmd[0]}{get_executable_extension()}"
        
        proc = subprocess.run(
            cmd, 
            check=False, 
            text=True, 
            capture_output=True,
            shell=use_shell if use_shell else False
        )
        return proc.returncode, proc.stdout.strip(), proc.stderr.strip()
    except FileNotFoundError:
        return 1, "", f"Command not found: {cmd[0]}"
    except Exception as e:
        return 1, "", str(e)


def which(program: str) -> Optional[str]:
    """Cross-platform 'which' implementation."""
    if is_windows():
        # Look for common extensions on Windows
        extensions = [".exe", ".bat", ".cmd", ".ps1"]
        
        # Check if program already has an extension
        has_extension = any(program.lower().endswith(ext.lower()) for ext in extensions)
        
        # If no extension, try all possibilities
        if not has_extension:
            for ext in extensions:
                path = shutil.which(f"{program}{ext}")
                if path:
                    return path
    
    return shutil.which(program)


def is_gh_installed() -> bool:
    """Check if GitHub CLI is installed."""
    return which("gh") is not None


def get_gh_installation_instructions() -> str:
    """Get platform-specific instructions for installing GitHub CLI."""
    if is_windows():
        return (
            "Install with winget: winget install GitHub.cli\n"
            "Or download from: https://cli.github.com/"
        )
    elif is_macos():
        return (
            "Install with Homebrew: brew install gh\n"
            "Or download from: https://cli.github.com/"
        )
    elif is_linux():
        return (
            "For Debian/Ubuntu: apt install gh\n"
            "For Fedora: dnf install gh\n"
            "For other distributions, see: https://cli.github.com/"
        )
    else:
        return "Download from: https://cli.github.com/"


def is_gh_authenticated() -> bool:
    """Check if GitHub CLI is authenticated."""
    return_code, _, stderr = run_command(["gh", "auth", "status"], check=False)
    
    # Handle unknown command error
    if return_code != 0 and "unknown command" in stderr and "auth" in stderr:
        # Fallback: try to check if git is configured with GitHub credentials
        ret_code, stdout, _ = run_command(["git", "config", "--get", "github.token"], check=False)
        if ret_code == 0 and stdout.strip():
            return True
            
        # Also check if user has git credentials configured, which might indicate they're authenticated
        ret_code, stdout, _ = run_command(["git", "config", "--get", "user.name"], check=False)
        has_name = ret_code == 0 and stdout.strip()
        
        ret_code, stdout, _ = run_command(["git", "config", "--get", "user.email"], check=False)
        has_email = ret_code == 0 and stdout.strip()
        
        # If they have both name and email configured, assume they might be authenticated
        # This is not a perfect check but better than nothing
        return has_name and has_email
        
    return return_code == 0


def authenticate_gh() -> bool:
    """Guide the user through GitHub CLI authentication."""
    print_status(
        "GitHub CLI needs authentication", 
        Status.INFO,
        "You'll be guided through the authentication process."
    )
    
    return_code, _, stderr = run_command(["gh", "auth", "login"], check=False)
    
    # Handle unknown command error
    if return_code != 0:
        if "unknown command" in stderr and "auth" in stderr:
            print_status(
                "GitHub CLI 'auth' command not available in this version", 
                Status.ERROR,
                "Please upgrade your GitHub CLI or authenticate manually:\n"
                "1. Create a Personal Access Token at https://github.com/settings/tokens\n"
                "2. Configure git with: git config --global github.token YOUR_TOKEN\n"
                "3. Set up your credentials with: git config --global user.name \"Your Name\"\n"
                "   git config --global user.email \"your.email@example.com\""
            )
        else:
            print_status("Authentication failed", Status.ERROR, stderr)
        return False
    
    return True


def check_git_repo() -> bool:
    """Check if current directory is a git repository."""
    return os.path.isdir(".git")


def initialize_git_repo() -> bool:
    """Initialize a git repository."""
    return_code, _, _ = run_command(["git", "init"])
    return return_code == 0


def get_current_branch() -> str:
    """Get the name of the current git branch."""
    return_code, stdout, _ = run_command(["git", "branch", "--show-current"], check=False)
    
    if return_code == 0 and stdout:
        return stdout
    
    # Fallback for older git versions
    return_code, stdout, _ = run_command(["git", "rev-parse", "--abbrev-ref", "HEAD"], check=False)
    if return_code == 0 and stdout and stdout != "HEAD":
        return stdout
    
    # Default branches to try
    return "main"


def get_remote_info() -> Dict:
    """Get information about the remote repository."""
    has_remote = False
    remote_url = ""
    repo_name = ""
    user_name = ""
    
    # Check if remote exists
    return_code, stdout, _ = run_command(["git", "remote", "-v"], check=False)
    if return_code == 0 and stdout:
        has_remote = True
        
        # Parse remote URL
        # Handle both HTTPS and SSH formats
        https_match = re.search(r'origin\s+https://github\.com/([^/]+)/([^.]+)(\.git)?', stdout)
        ssh_match = re.search(r'origin\s+git@github\.com:([^/]+)/([^.]+)(\.git)?', stdout)
        
        if https_match:
            user_name = https_match.group(1)
            repo_name = https_match.group(2)
            remote_url = stdout.split()[1]
        elif ssh_match:
            user_name = ssh_match.group(1)
            repo_name = ssh_match.group(2)
            remote_url = stdout.split()[1]
    
    return {
        "has_remote": has_remote,
        "remote_url": remote_url,
        "repo_name": repo_name,
        "user_name": user_name
    }


def setup_remote() -> bool:
    """Set up a remote repository."""
    print_status(
        "No remote repository found", 
        Status.INFO,
        "You need to link this project to a GitHub repository."
    )
    
    choice = Prompt.ask(
        "Choose an option", 
        choices=["create", "link", "cancel"], 
        default="create"
    )
    
    if choice == "cancel":
        return False
    
    if choice == "create":
        repo_name = Prompt.ask("Enter new repository name")
        description = Prompt.ask("Enter repository description", default="")
        visibility = Prompt.ask("Choose visibility", choices=["public", "private"], default="public")
        
        cmd = ["gh", "repo", "create", repo_name, f"--{visibility}"]
        if description:
            cmd.extend(["--description", description])
        cmd.append("--source=.")
        
        return_code, stdout, stderr = run_command(cmd)
        
        # Handle unknown command error
        if return_code != 0:
            if "unknown command" in stderr and "repo" in stderr:
                print_status(
                    "GitHub CLI 'repo create' command not available in this version", 
                    Status.INFO,
                    "Falling back to manual repository creation method."
                )
                # Fallback to manual repository creation
                print_status(
                    "Manual repository creation instructions:", 
                    Status.INFO,
                    "1. Go to https://github.com/new\n"
                    "2. Create a new repository named: " + repo_name + "\n"
                    "3. Follow the instructions on GitHub to push an existing repository"
                )
                
                # Ask user to enter the repo URL after they've created it
                if Confirm.ask("Have you created the repository on GitHub?"):
                    return setup_remote_manual()
                
                return False
            else:
                print_status(f"Failed to create repository", Status.ERROR, stderr)
                return False
                
        return True
    
    if choice == "link":
        return setup_remote_manual()
    
    return False


def setup_remote_manual() -> bool:
    """Set up a remote repository manually by asking for the URL."""
    # Get remote URL from user
    repo_url = Prompt.ask("Enter the GitHub repository URL")
    
    # Clean up URL if needed
    # Handle browser URLs like https://github.com/username/repo
    if "github.com" in repo_url and not repo_url.endswith(".git"):
        if not "//" in repo_url:
            repo_url = f"https://github.com/{repo_url}"
        if not repo_url.endswith(".git"):
            repo_url = f"{repo_url}.git"
    
    # Add remote
    return_code, _, stderr = run_command(["git", "remote", "add", "origin", repo_url])
    if return_code != 0:
        print_status(f"Failed to add remote", Status.ERROR, stderr)
        return False
    return True


def check_web_files() -> Tuple[bool, List[str]]:
    """Check for the presence of web files."""
    # Basic web files to check for
    web_files = ["index.html"]
    alternatives = ["index.md", "README.md"]
    
    # Check for the primary web files
    missing_files = [file for file in web_files if not os.path.exists(file)]
    
    # If primary files are missing, check for alternatives
    if missing_files:
        for alt in alternatives:
            if os.path.exists(alt):
                print_status(
                    f"Found {alt} instead of index.html", 
                    Status.INFO,
                    "This file will be used as the main page by GitHub Pages."
                )
                return True, []
    
    return len(missing_files) == 0, missing_files


def create_basic_web_files(missing_files: List[str]) -> bool:
    """Create basic versions of missing web files."""
    try:
        if "index.html" in missing_files:
            with open("index.html", "w", encoding="utf-8") as f:
                f.write("""<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>GitHub Pages Project</title>
    <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; max-width: 800px; margin: 0 auto; padding: 20px; }
        h1 { color: #0366d6; }
    </style>
</head>
<body>
    <h1>Welcome to my GitHub Pages site!</h1>
    <p>This is a basic page created by the GitHub Pages Publisher script.</p>
    <p>Edit this file to customize your site.</p>
</body>
</html>""")
        return True
    except Exception as e:
        print_status(f"Failed to create web files", Status.ERROR, str(e))
        return False


def check_network_connection() -> bool:
    """Check if there's an active internet connection."""
    try:
        # Try to connect to GitHub
        socket.create_connection(("github.com", 443), timeout=5)
        return True
    except (socket.timeout, socket.error):
        return False


def check_existing_gh_pages(user_name: str, repo_name: str) -> bool:
    """Check if GitHub Pages already exists for this repository."""
    if not user_name or not repo_name:
        return False
        
    url = f"https://{user_name}.github.io/{repo_name}"
    
    print_status(f"Checking for existing GitHub Pages at {url}", Status.INFO)
    
    # First check if we have internet connectivity
    if not check_network_connection():
        print_status(
            "Unable to check for existing GitHub Pages", 
            Status.WARNING,
            "No internet connection detected."
        )
        return False
    
    try:
        # Use urllib instead of curl for better cross-platform compatibility
        req = urllib.request.Request(url, method="HEAD")
        response = urllib.request.urlopen(req, timeout=5)
        return response.status == 200
    except urllib.error.HTTPError as e:
        if e.code == 404:
            return False
        else:
            print_status(
                f"Error checking GitHub Pages status (HTTP {e.code})", 
                Status.WARNING
            )
            return False
    except Exception as e:
        print_status(
            "Unable to check GitHub Pages status", 
            Status.WARNING,
            str(e)
        )
        return False


def publish_to_gh_pages(update: bool = False) -> bool:
    """Publish the project to GitHub Pages."""
    # First try using gh pages command (newer versions)
    cmd = ["gh", "pages", "deploy"]
    
    # Add current branch if we can determine it
    branch = get_current_branch()
    if branch:
        cmd.extend(["--branch", branch])
    
    if update:
        cmd.append("--force")
    
    return_code, stdout, stderr = run_command(cmd)
    
    # Check if the command succeeded
    if return_code == 0:
        print_status("Successfully published to GitHub Pages", Status.SUCCESS, stdout)
        return True
    # If command failed because 'pages' subcommand doesn't exist
    elif "unknown command" in stderr and "pages" in stderr:
        print_status(
            "GitHub CLI 'pages' command not available", 
            Status.INFO,
            "Falling back to manual git-based deployment"
        )
        return publish_using_git_fallback(branch)
    # Other errors
    else:
        print_status("Failed to publish to GitHub Pages", Status.ERROR, stderr)
        
        # Check for common errors and provide solutions
        if "git checkout gh-pages" in stderr:
            print_status(
                "Troubleshooting suggestion", 
                Status.INFO,
                "Try creating an empty gh-pages branch first:\n" +
                "git checkout --orphan gh-pages\n" +
                "git reset --hard\n" +
                "git commit --allow-empty -m 'Initial gh-pages commit'\n" +
                "git push origin gh-pages\n" +
                "git checkout main  # or your original branch"
            )
        elif "failed to push" in stderr.lower():
            print_status(
                "Troubleshooting suggestion", 
                Status.INFO,
                "Try pulling latest changes first:\n" +
                "git pull origin main  # or your branch name"
            )
        
        return False


def publish_using_git_fallback(source_branch: str) -> bool:
    """
    Safe git-based approach to publish to GitHub Pages when gh CLI pages command is unavailable.
    This approach preserves your working directory by using a separate worktree or temp directory.
    """
    print_status(
        "Using safe git-based GitHub Pages deployment", 
        Status.INFO,
        "This will NOT affect your current project files."
    )
    
    # Store current branch to return to it later
    original_branch = source_branch
    current_dir = os.getcwd()
    
    # Create a temporary directory outside the current project
    deploy_dir = os.path.join(tempfile.gettempdir(), f"gh_pages_deploy_{int(time.time())}")
    os.makedirs(deploy_dir, exist_ok=True)
    
    try:
        # Check if we have a gh-pages branch already
        return_code, stdout, _ = run_command(["git", "ls-remote", "--heads", "origin", "gh-pages"], check=False)
        branch_exists_remotely = stdout.strip() != ""
        
        # Clone the repository to the temp directory if the branch exists
        if branch_exists_remotely:
            clone_cmd = ["git", "clone", "--branch", "gh-pages", "--single-branch", "--depth", "1"]
            # Get the remote URL
            ret_code, remote_url, _ = run_command(["git", "remote", "get-url", "origin"], check=False)
            if ret_code != 0 or not remote_url:
                print_status("Failed to get remote URL", Status.ERROR)
                return False
                
            clone_cmd.extend([remote_url, deploy_dir])
            return_code, _, stderr = run_command(clone_cmd, check=False)
            if return_code != 0:
                # If clone fails, just create an empty directory
                print_status(
                    "Creating new gh-pages branch", 
                    Status.INFO,
                    "No existing gh-pages branch found or unable to clone it."
                )
        
        # Change to the deployment directory
        os.chdir(deploy_dir)
        
        # Initialize git if needed (if we didn't clone successfully)
        if not os.path.exists(os.path.join(deploy_dir, ".git")):
            init_cmd = ["git", "init"]
            run_command(init_cmd)
            
            # Setup remote
            ret_code, remote_url, _ = run_command(["git", "remote", "get-url", "origin"], cwd=current_dir, check=False)
            if ret_code == 0 and remote_url:
                run_command(["git", "remote", "add", "origin", remote_url])
        
        # Clear the directory contents (but keep .git)
        for item in os.listdir(deploy_dir):
            if item != ".git":
                item_path = os.path.join(deploy_dir, item)
                if os.path.isdir(item_path):
                    shutil.rmtree(item_path)
                else:
                    os.remove(item_path)
        
        # Prepare files for GitHub Pages based on project type
        print_status("Preparing files for GitHub Pages", Status.INFO)
        
        # Check if this is a React/Node.js project
        package_json_path = os.path.join(current_dir, "package.json")
        if os.path.exists(package_json_path):
            # This is likely a React, Next.js, or similar project
            print_status("Detected JavaScript/TypeScript project", Status.INFO)
            
            # Check if build directory exists (common for React)
            build_dirs = ["build", "dist", "out", "public", ".next"]
            build_dir = None
            
            for dir_name in build_dirs:
                if os.path.exists(os.path.join(current_dir, dir_name)):
                    build_dir = os.path.join(current_dir, dir_name)
                    break
            
            if build_dir:
                print_status(f"Copying from build directory: {os.path.basename(build_dir)}", Status.INFO)
                # Copy build folder contents to deploy directory
                for item in os.listdir(build_dir):
                    src = os.path.join(build_dir, item)
                    dst = os.path.join(deploy_dir, item)
                    if os.path.isdir(src):
                        shutil.copytree(src, dst)
                    else:
                        shutil.copy2(src, dst)
            else:
                # If no build directory, suggest running build command
                print_status(
                    "No build directory found", 
                    Status.WARNING,
                    "You may need to build your project first with 'npm run build' or similar command."
                )
                
                # Copy needed files based on project structure
                # Only copy files that are commonly used in web projects
                web_files = [
                    "index.html", "404.html", "*.css", "*.js", "assets/**", 
                    "images/**", "img/**", "css/**", "js/**", "fonts/**", "media/**"
                ]
                
                for pattern in web_files:
                    for filepath in glob.glob(os.path.join(current_dir, pattern), recursive=True):
                        if os.path.isfile(filepath):
                            rel_path = os.path.relpath(filepath, current_dir)
                            dst_path = os.path.join(deploy_dir, rel_path)
                            os.makedirs(os.path.dirname(dst_path), exist_ok=True)
                            shutil.copy2(filepath, dst_path)
        else:
            # For non-Node projects or simple websites
            # Copy only web-related files
            print_status("Copying web files", Status.INFO)
            web_files = [
                "index.html", "index.md", "README.md", "404.html",
                "*.css", "*.js", "assets/**", "images/**", "img/**", 
                "css/**", "js/**", "fonts/**", "media/**"
            ]
            
            for pattern in web_files:
                for filepath in glob.glob(os.path.join(current_dir, pattern), recursive=True):
                    if os.path.isfile(filepath):
                        rel_path = os.path.relpath(filepath, current_dir)
                        dst_path = os.path.join(deploy_dir, rel_path)
                        os.makedirs(os.path.dirname(dst_path), exist_ok=True)
                        shutil.copy2(filepath, dst_path)
        
        # Create an index.html file if it doesn't exist
        if not os.path.exists(os.path.join(deploy_dir, "index.html")):
            # Check for README.md to convert
            if os.path.exists(os.path.join(deploy_dir, "README.md")):
                print_status(
                    "Creating index.html from README.md", 
                    Status.INFO
                )
                with open(os.path.join(deploy_dir, "README.md"), 'r', encoding='utf-8') as readme:
                    content = readme.read()
                
                with open(os.path.join(deploy_dir, "index.html"), 'w', encoding='utf-8') as index:
                    index.write(f"""<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>GitHub Pages</title>
    <style>
        body {{ font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif; line-height: 1.6; max-width: 800px; margin: 0 auto; padding: 20px; }}
        h1, h2, h3 {{ color: #0366d6; }}
        pre {{ background-color: #f6f8fa; padding: 16px; border-radius: 6px; overflow: auto; }}
        code {{ font-family: SFMono-Regular, Consolas, "Liberation Mono", Menlo, monospace; }}
    </style>
</head>
<body>
    <div id="content">
        <!-- README content will be displayed here -->
        <h1>GitHub Pages</h1>
        <p>This page was automatically generated from README.md</p>
        <pre>{content}</pre>
    </div>
</body>
</html>""")
            else:
                # Create a basic index.html
                print_status(
                    "Creating basic index.html", 
                    Status.INFO
                )
                with open(os.path.join(deploy_dir, "index.html"), 'w', encoding='utf-8') as f:
                    f.write("""<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>GitHub Pages Project</title>
    <style>
        body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif; line-height: 1.6; max-width: 800px; margin: 0 auto; padding: 20px; }
        h1 { color: #0366d6; }
    </style>
</head>
<body>
    <h1>Welcome to GitHub Pages</h1>
    <p>This is a basic page created by the GitHub Pages Publisher script.</p>
    <p>Edit this file to customize your site.</p>
</body>
</html>""")
        
        # Setup git user info if needed (copy from main repo)
        ret_code, name, _ = run_command(["git", "config", "user.name"], cwd=current_dir, check=False)
        if ret_code == 0 and name:
            run_command(["git", "config", "user.name", name.strip()])
            
        ret_code, email, _ = run_command(["git", "config", "user.email"], cwd=current_dir, check=False)
        if ret_code == 0 and email:
            run_command(["git", "config", "user.email", email.strip()])
        
        # Create .nojekyll file to bypass Jekyll processing
        with open(os.path.join(deploy_dir, ".nojekyll"), 'w') as f:
            pass
        
        # Add all files
        run_command(["git", "add", "."])
        
        # Commit changes
        run_command([
            "git", "commit", "-m", "Update GitHub Pages content"
        ], check=False)
        
        # Push to gh-pages branch
        push_cmd = ["git", "push", "origin"]
        if branch_exists_remotely:
            push_cmd.append("HEAD:gh-pages")
        else:
            push_cmd.extend(["HEAD:gh-pages", "--force"])
        
        return_code, stdout, stderr = run_command(push_cmd)
        
        if return_code != 0:
            print_status("Failed to push to gh-pages branch", Status.ERROR, stderr)
            return False
        
        print_status(
            "Successfully published to GitHub Pages", 
            Status.SUCCESS,
            "Your site should be available shortly at https://yourusername.github.io/yourrepo"
        )
        return True
        
    except Exception as e:
        print_status("Error during git-based deployment", Status.ERROR, str(e))
        return False
    finally:
        # Always return to the original directory
        os.chdir(current_dir)
        # Clean up temp directory after successful deployment
        try:
            shutil.rmtree(deploy_dir, ignore_errors=True)
        except:
            pass


def commit_changes() -> bool:
    """Commit any uncommitted changes."""
    # Check if there are changes to commit
    return_code, stdout, _ = run_command(["git", "status", "--porcelain"])
    
    if stdout:
        print_status("Uncommitted changes detected", Status.INFO)
        
        if Confirm.ask("Would you like to commit these changes?"):
            commit_msg = Prompt.ask("Enter commit message", default="Update web files")
            
            # Add all changes
            run_command(["git", "add", "."])
            
            # Set git config if needed
            email_set = run_command(["git", "config", "user.email"], check=False)[0] == 0
            name_set = run_command(["git", "config", "user.name"], check=False)[0] == 0
            
            if not email_set or not name_set:
                print_status(
                    "Git user configuration is required", 
                    Status.INFO,
                    "Git needs to know who you are before committing."
                )
                
                if not name_set:
                    name = Prompt.ask("Enter your name for git commits")
                    run_command(["git", "config", "user.name", name])
                
                if not email_set:
                    email = Prompt.ask("Enter your email for git commits")
                    run_command(["git", "config", "user.email", email])
            
            # Commit changes
            return_code, _, stderr = run_command(["git", "commit", "-m", commit_msg])
            
            if return_code != 0:
                print_status("Failed to commit changes", Status.ERROR, stderr)
                return False
            
            print_status("Changes committed successfully", Status.SUCCESS)
    
    return True


def push_changes() -> bool:
    """Push changes to remote repository."""
    # Get current branch
    branch = get_current_branch()
    
    # Try to push to the current branch
    return_code, _, stderr = run_command(["git", "push", "-u", "origin", branch])
    
    if return_code != 0:
        # If the branch doesn't exist on remote, suggest creating it
        if "remote ref does not exist" in stderr:
            print_status(
                f"Branch '{branch}' doesn't exist on remote yet", 
                Status.INFO
            )
            return run_command(["git", "push", "--set-upstream", "origin", branch])[0] == 0
        
        # Try with common branch names if current branch push failed
        common_branches = ["main", "master"]
        for common_branch in common_branches:
            if common_branch != branch:
                print_status(
                    f"Trying to push to '{common_branch}' branch instead", 
                    Status.INFO
                )
                ret_code, _, _ = run_command(["git", "push", "-u", "origin", common_branch], check=False)
                if ret_code == 0:
                    return True
        
        print_status("Failed to push changes", Status.ERROR, stderr)
        return False
    
    return True


def check_gh_latest_version() -> None:
    """Check if GitHub CLI is at the latest version."""
    return_code, stdout, _ = run_command(["gh", "--version"], check=False)
    
    if return_code == 0:
        # Only proceed with update check if we're not on Windows, as updating on Windows
        # typically requires admin privileges and is better handled through package managers
        if not is_windows():
            return_code, stdout, stderr = run_command(["gh", "update", "--check"], check=False)
            
            # Handle unknown command error
            if return_code != 0 and "unknown command" in stderr and "update" in stderr:
                # Skip update check for older versions that don't support it
                pass
            elif return_code == 0 and "new version" in stdout.lower():
                print_status(
                    "A new version of GitHub CLI is available", 
                    Status.INFO,
                    "Consider updating with 'gh update'"
                )


def configure_gh_pages_source() -> bool:
    """Configure the GitHub Pages source branch if needed."""
    # Check current GitHub Pages configuration
    return_code, stdout, stderr = run_command(["gh", "api", "repos/:owner/:repo/pages"], check=False)
    
    # If gh api command not available or fails
    if return_code != 0:
        # Check if it's because the command is not available
        if "unknown command" in stderr and "api" in stderr:
            print_status(
                "GitHub CLI API command not available in this version", 
                Status.INFO,
                "Skipping automated configuration. Please configure GitHub Pages in repository settings."
            )
            print_status(
                "Configuration instructions", 
                Status.INFO,
                "1. Go to your repository on GitHub\n"
                "2. Navigate to Settings > Pages\n"
                "3. Under 'Source', select branch 'gh-pages'\n"
                "4. Click Save"
            )
            return True
        
        # If Pages aren't configured yet, or if there's an error, we'll set them up
        # Get the current branch
        branch = get_current_branch()
        
        print_status(
            "Configuring GitHub Pages in repository settings", 
            Status.INFO,
            f"Setting source to branch: {branch}"
        )
        
        # Create the gh-pages branch if it doesn't exist
        create_branch_cmd = [
            "gh", "api", "--method", "POST", "repos/:owner/:repo/pages",
            "-f", f"source.branch={branch}",
            "-f", "source.path=/"
        ]
        
        return_code, _, stderr = run_command(create_branch_cmd, check=False)
        
        if return_code != 0 and "pages already exist" not in stderr.lower():
            print_status(
                "Failed to configure GitHub Pages", 
                Status.WARNING,
                "You may need to configure it manually in repository settings."
            )
            return False
    
    return True


def main() -> int:
    """Main function to orchestrate the GitHub Pages publishing process."""
    console.print(Panel.fit(
        "[bold blue]GitHub Pages Publisher[/bold blue]\n"
        f"Running on [yellow]{platform.system()}[/yellow] ({platform.platform()})"
    ))
    
    # Step 1: Check if gh CLI is installed
    if not is_gh_installed():
        instructions = get_gh_installation_instructions()
        print_status(
            "GitHub CLI is not installed", 
            Status.ERROR,
            f"Installation instructions:\n{instructions}"
        )
        return 1
    
    print_status("GitHub CLI is installed", Status.SUCCESS)
    check_gh_latest_version()
    
    # Step 2: Check if gh CLI is authenticated
    if not is_gh_authenticated():
        print_status("GitHub CLI is not authenticated", Status.WARNING)
        if not authenticate_gh():
            print_status("Authentication failed", Status.ERROR)
            return 1
    
    print_status("GitHub CLI is authenticated", Status.SUCCESS)
    
    # Step 3: Check if current directory is a git repository
    if not check_git_repo():
        print_status("Not a git repository", Status.WARNING)
        if Confirm.ask("Initialize git repository?"):
            if not initialize_git_repo():
                print_status("Failed to initialize git repository", Status.ERROR)
                return 1
            print_status("Git repository initialized", Status.SUCCESS)
        else:
            print_status("Cannot proceed without a git repository", Status.ERROR)
            return 1
    
    # Step 4: Check remote repository
    remote_info = get_remote_info()
    
    if not remote_info["has_remote"]:
        if not setup_remote():
            print_status("Cannot proceed without a remote repository", Status.ERROR)
            return 1
        # Refresh remote info
        remote_info = get_remote_info()
    
    print_status(
        f"Connected to remote: {remote_info['remote_url']}", 
        Status.SUCCESS
    )
    
    # Step 5: Check for web files
    files_exist, missing_files = check_web_files()
    
    if not files_exist:
        print_status(
            "Missing required web files", 
            Status.WARNING, 
            f"Missing files: {', '.join(missing_files)}"
        )
        
        if Confirm.ask("Create basic web files?"):
            if not create_basic_web_files(missing_files):
                print_status("Failed to create web files", Status.ERROR)
                return 1
            print_status("Basic web files created", Status.SUCCESS)
        else:
            print_status(
                "Cannot proceed without required web files", 
                Status.ERROR
            )
            return 1
    
    # Step 6: Commit any changes
    if not commit_changes():
        print_status("Cannot proceed with uncommitted changes", Status.ERROR)
        return 1
    
    # Step 7: Push changes
    if Confirm.ask("Push changes to remote?"):
        if not push_changes():
            print_status("Failed to push changes", Status.ERROR)
            return 1
        print_status("Changes pushed to remote", Status.SUCCESS)
    
    # Step 8: Configure GitHub Pages source
    configure_gh_pages_source()
    
    # Step 9: Check if GitHub Pages already exists
    pages_exist = check_existing_gh_pages(
        remote_info["user_name"], 
        remote_info["repo_name"]
    )
    
    # Step 10: Publish to GitHub Pages
    if pages_exist:
        print_status("GitHub Pages already exists for this repository", Status.INFO)
        choice = Prompt.ask(
            "How would you like to proceed?",
            choices=["update", "replace", "cancel"],
            default="update"
        )
        
        if choice == "cancel":
            print_status("Publishing cancelled", Status.INFO)
            return 0
        
        publish_to_gh_pages(update=(choice == "replace"))
    else:
        print_status("No existing GitHub Pages found", Status.INFO)
        if Confirm.ask("Publish to GitHub Pages?"):
            publish_to_gh_pages()
    
    # Step 11: Show success message with the URL
    if remote_info["user_name"] and remote_info["repo_name"]:
        url = f"https://{remote_info['user_name']}.github.io/{remote_info['repo_name']}"
        print_status(
            "Process completed successfully!", 
            Status.SUCCESS,
            f"Your GitHub Pages site should be available at:\n{url}\n"
            f"Note that it may take a few minutes for changes to appear."
        )
    
    return 0


if __name__ == "__main__":
    try:
        sys.exit(main())
    except KeyboardInterrupt:
        print_status("\nProcess cancelled by user", Status.INFO)
        sys.exit(130)
    except Exception as e:
        import traceback
        print_status(f"An unexpected error occurred", Status.ERROR, f"{str(e)}\n{traceback.format_exc()}")
        sys.exit(1)