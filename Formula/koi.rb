class Koi < Formula
  desc "Bashful argument parsing"
  homepage "https://github.com/wcarhart/koi"
  license "MIT"
  head "https://github.com/wcarhart/koi.git"

  depends_on "bash"

  def install
    pkgshare.install "koi"
    bin.install_symlink pkgshare/"koi"
  end

  test do
    (testpath/"example.sh").write <<~BASH
      source koi
      koi::add_command demo --function demo --description "Demo command"
      demo() { echo "handler should not run"; }
      koi::run "$@"
    BASH
    expected = <<~OUTPUT
      Usage: example.sh COMMAND [args]

      Commands:
        demo  Demo command

      Options:
        -h, --help  Show this help
    OUTPUT
    ENV.prepend_path "PATH", bin
    assert_equal expected, shell_output("#{formula_opt_bin("bash")}/bash #{testpath}/example.sh")
  end
end
