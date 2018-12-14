import { Framework } from '@lib/frameworks/framework'
import { ISuite, ISuiteResult } from '@lib/frameworks/suite'
import { ITest } from '@lib/frameworks/test'
import { PHPUnitSuite } from '@lib/frameworks/phpunit/suite'

export class PHPUnit extends Framework {
    readonly name = 'PHPUnit'

    // Suites are defined in the parent constructor (albeit a different class),
    // so we'll just inherit the default value from it (or risk overriding it).
    public suites!: Array<PHPUnitSuite>

    /**
     * Reload this framework's suites and tests.
     */
    protected reload (): Promise<string> {
        return new Promise((resolve, reject) => {
            this.spawn(['--columns=42'].concat(this.runArgs()))
                .on('report', ({ report }) => {
                    report.forEach((result: ISuiteResult) => {
                        this.makeSuite(result, true)
                    })
                    resolve('success')
                })
                .on('killed', ({ process }) => {
                    resolve('killed')
                })
                .on('error', ({ message }) => {
                    reject(message)
                })
        })
    }

    /**
     * The command arguments for running this framework.
     */
    protected runArgs (): Array<string> {
        const args = [
            '--color=always',
            '--printer',
            '\\LodeApp\\PHPUnit\\Reporter'
        ]

        if (__DEV__) {
            args.push('--verbose')
        }

        return args
    }

    /**
     * The command arguments for running this framework selectively.
     */
    protected runSelectiveArgs (): Array<string> {
        const args: Array<string> = ['--filter']
        const filters: Array<string> = []

        this.suites.filter(suite => suite.selected).forEach(suite => {
            const suiteClass = PHPUnitSuite.escapeClassName(suite.class!)
            const selected = suite.tests.filter((test: ITest) => test.selected)
            if (selected.length !== suite.tests.length) {
                // If not running all tests from suite, filter each one
                selected.forEach((test: ITest) => {
                    filters.push(`${suiteClass}::${test.name}$`)
                })
            } else {
                filters.push(suiteClass)
            }
        })

        args.push(`"${filters.join('|')}"`)

        return args.concat(this.runArgs())
    }

    /**
     * Instantiates a new PHPUnit suite using a result object.
     *
     * @param result The standardised suite results.
     */
    protected newSuite (result: ISuiteResult): ISuite {
        return new PHPUnitSuite({
            path: this.path,
            vmPath: this.vmPath
        }, result)
    }

    /**
     * Troubleshoot a PHPUnit error.
     *
     * @param error The error to be parsed for troubleshooting.
     */
    protected troubleshoot (error: Error | string): string {
        if (error instanceof Error) {
            error = error.toString()
        }

        if (error.includes('Could not use "\\LodeApp\\PHPUnit\\Reporter" as printer: class does not exist')) {
            return 'Make sure to include the Lode PHPUnit reporter package as a dependency in your repository. If you already have, try running `composer dump-autoload`.'
        }

        return ''
    }
}
